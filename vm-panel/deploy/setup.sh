#!/usr/bin/env bash
# One-shot installer for the VM panel on an Ubuntu/Debian Google Cloud VM (CLAUDE.md steps 1-7).
# Run from the unzipped vm-panel folder:   sudo bash deploy/setup.sh [domain] [customer-app-port]
# Safe to re-run (e.g. after uploading a new version): keeps the secrets, the database,
# customer files, the nginx site and the HTTPS certificates.
set -euo pipefail

DOMAIN=${1:-deshjure.shop}
APP_PORT=${2:-8080}               # port of the customer's own app, served on https://$DOMAIN
PANEL_HOST="panel.$DOMAIN"
APP_DIR=/opt/vm-panel
ENV_FILE=/etc/vm-panel/panel.env  # root-only: JWT secret and super admin login
SITE=/etc/nginx/sites-available/vm-panel
SVC=vm-panel
SVC_USER=panel
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

say(){ printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn(){ printf '\033[33mWARN\033[0m  %s\n' "$*"; }
die(){ printf '\033[31mERROR\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "Run it with sudo:  sudo bash deploy/setup.sh"
command -v apt-get >/dev/null || die "Only Ubuntu/Debian is supported."
[ -f "$SRC/server/index.js" ] && [ -f "$SRC/client/package.json" ] || die "Run it from inside the unzipped vm-panel folder."
[[ $DOMAIN =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || die "Not a valid domain: $DOMAIN"
[[ $APP_PORT =~ ^[0-9]+$ ]] && [ "$APP_PORT" != 3000 ] || die "Customer app port must be a number other than 3000"

cat <<EOF
This sets up the VM panel on this machine:
  1. installs Node.js 22, nginx and certbot (if missing)
  2. copies the panel to $APP_DIR and builds it (existing data in $APP_DIR/server/data is kept)
  3. asks for the super admin login and stores it with a new JWT secret in $ENV_FILE (root only)
  4. runs it as service '$SVC' under system user '$SVC_USER' on 127.0.0.1:3000, started on boot
  5. nginx:  https://$PANEL_HOST -> panel,  https://$DOMAIN and www -> 127.0.0.1:$APP_PORT
     and HTTPS certificates from Let's Encrypt (you accept their terms of service)
  6. checks open ports and SSH settings (reports only, changes nothing)
  7. smoke test (creates a test customer and deletes it again)
Nothing is deleted.
EOF
read -rp "Continue? [y/N] " a; [[ ${a:-} =~ ^[Yy] ]] || exit 1

say "1/7 Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx rsync curl openssl ca-certificates >/dev/null
node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$node_major" -lt 22 ]; then   # Node 20 is end-of-life since April 2026
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v), npm $(npm -v), $(nginx -v 2>&1)"

say "2/7 Build"
id "$SVC_USER" &>/dev/null || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$SVC_USER"
mkdir -p "$APP_DIR"
# Code is owned by root so the service cannot modify it; only server/data belongs to the service user.
[ "$SRC" = "$APP_DIR" ] || rsync -a --chown=root:root --exclude node_modules --exclude client/dist --exclude server/data --exclude .git "$SRC"/ "$APP_DIR"/
(cd "$APP_DIR/client" && npm ci --no-audit --no-fund --loglevel=error && npm run build --silent)
(cd "$APP_DIR/server" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
install -d -o "$SVC_USER" -g "$SVC_USER" -m 700 "$APP_DIR/server/data"

say "3/7 Secrets"
install -d -o root -g root -m 700 "$(dirname "$ENV_FILE")"
if [ -f "$ENV_FILE" ]; then
  echo "Keeping $ENV_FILE (same JWT secret and super admin login as before)."
else
  read -rp "Super admin username [superadmin]: " SU; SU=${SU:-superadmin}
  [[ $SU =~ ^[A-Za-z0-9_.-]{3,32}$ ]] || die "Username: 3-32 letters, numbers, . _ -"
  while :; do
    read -rsp "Super admin password (10+ characters): " SP; echo
    read -rsp "Repeat the password: " SP2; echo
    if [ "$SP" != "$SP2" ]; then warn "The passwords differ, try again."
    elif [ ${#SP} -lt 10 ]; then warn "Use at least 10 characters."
    elif [[ $SP == *[\'\"\\\$\`]* ]]; then warn "Please avoid these characters: ' \" \\ \$ \`"  # keeps the env file unambiguous for systemd and bash
    else break; fi
  done
  (umask 077; printf "JWT_SECRET=%s\nSUPER_USER=%s\nSUPER_PASS='%s'\nPORT=3000\nNODE_ENV=production\n" \
    "$(openssl rand -hex 32)" "$SU" "$SP" >"$ENV_FILE")
  unset SP SP2
  echo "Saved to $ENV_FILE (readable by root only)."
fi
chown root:root "$ENV_FILE"; chmod 600 "$ENV_FILE"

say "4/7 Service"
cat >/etc/systemd/system/$SVC.service <<EOF
[Unit]
Description=VM Panel
After=network.target

[Service]
User=$SVC_USER
Group=$SVC_USER
WorkingDirectory=$APP_DIR/server
EnvironmentFile=$ENV_FILE
ExecStart=$(command -v node) index.js
Restart=always
RestartSec=3
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --quiet "$SVC"
systemctl restart "$SVC"
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:3000/api/me && break; sleep 1; done
curl -s -o /dev/null http://127.0.0.1:3000/api/me || { journalctl -u "$SVC" -n 30 --no-pager; die "The panel did not start (log above)."; }
echo "Panel is running on 127.0.0.1:3000 and starts on boot."

say "5/7 nginx and HTTPS"
if [ -f "$SITE" ]; then
  echo "Keeping $SITE (delete it and re-run to regenerate)."
else
  cat >"$SITE" <<EOF
# Written by deploy/setup.sh; certbot adds the HTTPS lines.
server {
  listen 80; server_name $PANEL_HOST;
  client_max_body_size 30m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
}
# Customer's own app on the main domain
server {
  listen 80; server_name $DOMAIN www.$DOMAIN;
  location / { proxy_pass http://127.0.0.1:$APP_PORT; proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
}
EOF
fi
ln -sf "$SITE" /etc/nginx/sites-enabled/vm-panel
nginx -t
systemctl enable --quiet --now nginx
systemctl reload nginx

ext_ip=$(curl -s --max-time 3 -H 'Metadata-Flavor: Google' \
  http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip || true)
echo "This VM's external IP: ${ext_ip:-unknown}"
hosts=()
for h in "$PANEL_HOST" "$DOMAIN" "www.$DOMAIN"; do
  got=$(getent ahostsv4 "$h" | awk '{print $1}' | sort -u | paste -sd' ' || true)
  if [ -z "$got" ]; then warn "$h has no DNS A record yet."
  elif [ -n "$ext_ip" ] && [ "$got" != "$ext_ip" ]; then warn "$h points to $got, not to this VM ($ext_ip). With Cloudflare, set it to 'DNS only'."
  else echo "DNS ok: $h -> $got"; hosts+=("$h"); fi
done
if [[ " ${hosts[*]} " == *" $PANEL_HOST "* ]]; then
  email_args=(--register-unsafely-without-email)
  if [ ! -d /etc/letsencrypt/accounts ]; then
    read -rp "Email for Let's Encrypt (optional, press Enter to skip): " em
    [ -z "$em" ] || email_args=(-m "$em")
  fi
  d_args=(); for h in "${hosts[@]}"; do d_args+=(-d "$h"); done
  certbot --nginx --non-interactive --agree-tos --redirect --expand --keep-until-expiring "${email_args[@]}" "${d_args[@]}" \
    || warn "certbot failed. Check DNS and that the GCP firewall allows tcp:80, then re-run this script."
  [ ${#hosts[@]} = 3 ] || warn "Not every name got a certificate. Fix the DNS warnings above, then re-run this script."
else
  warn "Skipping HTTPS: point the A records above to ${ext_ip:-this VM}, wait a few minutes, then re-run this script."
fi

say "6/7 Open ports and SSH"
ss -Htln | awk '{print $4}' | sort -u | while read -r a; do
  host=${a%:*}; port=${a##*:}
  case "$host" in 127.*|"[::1]") continue ;; esac
  case "$port" in
    80|443) echo "ok    $a (web)" ;;
    22) echo "ok    $a (SSH: limit it in the GCP firewall)" ;;
    *) warn "$a listens on a public address; keep tcp:$port closed in the GCP firewall or bind it to 127.0.0.1" ;;
  esac
done
sshd_cfg=$(sshd -T 2>/dev/null || true)
pa=$(awk '$1=="passwordauthentication"{print $2}' <<<"$sshd_cfg")
prl=$(awk '$1=="permitrootlogin"{print $2}' <<<"$sshd_cfg")
if [ "$pa" = no ]; then echo "ok    SSH password login is off"; else warn "SSH password login is '${pa:-unknown}' (set PasswordAuthentication no)"; fi
case "$prl" in
  no|prohibit-password|without-password) echo "ok    SSH root login: $prl" ;;
  *) warn "SSH root login is '${prl:-unknown}' (set PermitRootLogin no)" ;;
esac
echo "GCP firewall (VPC network > Firewall): allow tcp:80,443 from anywhere; limit tcp:22. Nothing else open."

say "7/7 Smoke test"
# The env file is root-only and holds the super admin login; pass it to the test via env, not argv.
# shellcheck source=/dev/null
(set -a; . "$ENV_FILE"; set +a; bash "$APP_DIR/smoke-test.sh" http://127.0.0.1:3000) || warn "Smoke test had failures (see above)."
web=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 --resolve "$PANEL_HOST:443:127.0.0.1" "https://$PANEL_HOST/api/me" || true)
if [ "$web" = 401 ]; then echo "ok    https://$PANEL_HOST reaches the panel through nginx"
else warn "https://$PANEL_HOST answered '$web' (expected 401 before login)"; fi

SU_NOW=$(awk -F= '$1=="SUPER_USER"{print $2}' "$ENV_FILE")
cat <<EOF

Done.
  Panel:    https://$PANEL_HOST   (log in as $SU_NOW)
  Main app: https://$DOMAIN -> 127.0.0.1:$APP_PORT (shows 502 until the customer's app runs on that port)
  Logs:     journalctl -u $SVC -f
  Restart:  sudo systemctl restart $SVC
  Backup:   $APP_DIR/server/data
  Update:   upload and unzip the new version, then run this script again
EOF
