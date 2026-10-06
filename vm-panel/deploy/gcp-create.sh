#!/usr/bin/env bash
# Creates everything on Google Cloud and installs the panel, in one go. Run it in Cloud Shell:
#   unzip -o vm-panel-deshjure.zip && bash vm-panel/deploy/gcp-create.sh deshjure.shop
# It reserves a static IP, opens tcp:80/443, creates an Ubuntu 24.04 VM, waits for your DNS records,
# then uploads this folder to the VM and runs deploy/setup.sh there. Safe to re-run: existing
# resources are reused, never deleted.
# Optional overrides: REGION=asia-southeast1 ZONE=asia-southeast1-b MACHINE=e2-medium bash ...
set -euo pipefail

DOMAIN=${1:-deshjure.shop}
APP_PORT=${2:-8080}
PROJECT=$(gcloud config get-value project 2>/dev/null || true)
REGION=${REGION:-asia-south1}        # Mumbai
ZONE=${ZONE:-$REGION-a}
MACHINE=${MACHINE:-e2-small}         # 2 GB RAM; e2-micro (1 GB) is too small to build the client reliably
DISK_GB=${DISK_GB:-20}
VM=${VM:-vm-panel}
NETWORK=${NETWORK:-default}
IP_NAME=$VM-ip
TAG=$VM
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

say(){ printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn(){ printf '\033[33mWARN\033[0m  %s\n' "$*"; }
die(){ printf '\033[31mERROR\033[0m %s\n' "$*" >&2; exit 1; }
have(){ "$@" >/dev/null 2>&1; }
dns_of(){ getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u | paste -sd' ' || true; }

command -v gcloud >/dev/null || die "Run this in Google Cloud Shell (or anywhere gcloud is installed and logged in)."
[ -n "$PROJECT" ] || die "No project selected. Run: gcloud config set project YOUR_PROJECT_ID"
[ -f "$SRC/deploy/setup.sh" ] || die "deploy/setup.sh not found next to this script."
[[ $DOMAIN =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || die "Not a valid domain: $DOMAIN"

cat <<EOF
This creates on Google Cloud project '$PROJECT':
  - static external IP '$IP_NAME' in $REGION
  - firewall rule '$VM-allow-web' (tcp:80,443 from anywhere, only for this VM)
  - VM '$VM' in $ZONE: $MACHINE, Ubuntu 24.04 LTS, ${DISK_GB} GB disk  (billed while it exists)
Then it waits for your DNS records and installs the panel for https://panel.$DOMAIN
Existing resources with these names are reused; nothing is deleted.
EOF
read -rp "Continue? [y/N] " a; [[ ${a:-} =~ ^[Yy] ]] || exit 1

say "1/5 Compute Engine API"
gcloud services enable compute.googleapis.com
have gcloud compute networks describe "$NETWORK" || die "VPC network '$NETWORK' not found. Set NETWORK=<name> and re-run."

say "2/5 Static external IP"
have gcloud compute addresses describe "$IP_NAME" --region "$REGION" \
  || gcloud compute addresses create "$IP_NAME" --region "$REGION" --network-tier PREMIUM
IP=$(gcloud compute addresses describe "$IP_NAME" --region "$REGION" --format='value(address)')
echo "Static IP: $IP"

say "3/5 Firewall"
have gcloud compute firewall-rules describe "$VM-allow-web" \
  || gcloud compute firewall-rules create "$VM-allow-web" --network "$NETWORK" --direction INGRESS --action ALLOW \
       --rules tcp:80,tcp:443 --source-ranges 0.0.0.0/0 --target-tags "$TAG" --description "VM panel: HTTP and HTTPS"
if ! have gcloud compute firewall-rules describe default-allow-ssh; then
  # Needed for the upload below. Login is key-only on Google's Ubuntu images.
  have gcloud compute firewall-rules describe "$VM-allow-ssh" \
    || gcloud compute firewall-rules create "$VM-allow-ssh" --network "$NETWORK" --direction INGRESS --action ALLOW \
         --rules tcp:22 --source-ranges 0.0.0.0/0 --target-tags "$TAG" --description "VM panel: SSH (key-only)"
fi
echo "Open to the internet: tcp:80, tcp:443 (and SSH with keys only)."

say "4/5 VM"
if have gcloud compute instances describe "$VM" --zone "$ZONE"; then
  echo "VM '$VM' already exists, reusing it."
else
  gcloud compute instances create "$VM" --zone "$ZONE" --machine-type "$MACHINE" \
    --image-family ubuntu-2404-lts-amd64 --image-project ubuntu-os-cloud \
    --boot-disk-size "${DISK_GB}GB" --boot-disk-type pd-balanced \
    --network "$NETWORK" --network-tier PREMIUM --address "$IP" --tags "$TAG"
fi

cat <<EOF

Now add these 3 DNS records where you bought $DOMAIN (the registrar's DNS settings):
    Type A   Name/Host: @       Value: $IP
    Type A   Name/Host: www     Value: $IP
    Type A   Name/Host: panel   Value: $IP
Delete any other A/AAAA records for these three names. With Cloudflare, set them to "DNS only".
EOF
read -rp "Press Enter once they are saved... " _
echo "Waiting for DNS (checks every 20 s, up to 15 min; the VM keeps booting meanwhile)..."
dns_ok=0
for _ in $(seq 1 45); do
  pending=()
  for h in "$DOMAIN" "www.$DOMAIN" "panel.$DOMAIN"; do [ "$(dns_of "$h")" = "$IP" ] || pending+=("$h"); done
  if [ ${#pending[@]} = 0 ]; then dns_ok=1; echo "DNS ok: all three names point to $IP"; break; fi
  echo "  not yet: ${pending[*]}"; sleep 20
done
[ $dns_ok = 1 ] || warn "DNS is not visible yet. Installing anyway; setup.sh will skip HTTPS and tell you to re-run it."

say "5/5 Upload and install"
echo "Waiting for SSH on the VM (the first connection also creates your Cloud Shell SSH key)..."
ssh_ok=0
for _ in $(seq 1 30); do
  if have gcloud compute ssh "$VM" --zone "$ZONE" --quiet --strict-host-key-checking=no --command true; then ssh_ok=1; break; fi
  sleep 10
done
[ $ssh_ok = 1 ] || die "Could not SSH to the VM. Try: gcloud compute ssh $VM --zone $ZONE"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
name=$(basename "$SRC")
tar -C "$(dirname "$SRC")" --exclude=node_modules --exclude="$name/client/dist" --exclude="$name/server/data" \
  -czf "$TMP/vm-panel.tgz" "$name"
gcloud compute scp --zone "$ZONE" --quiet "$TMP/vm-panel.tgz" "$VM:vm-panel.tgz"
# -t gives setup.sh a terminal, so it can ask for the super admin password on the VM.
gcloud compute ssh "$VM" --zone "$ZONE" --quiet --ssh-flag=-t \
  --command "mkdir -p vm-panel-upload && tar -xzf vm-panel.tgz -C vm-panel-upload && sudo bash vm-panel-upload/$name/deploy/setup.sh $DOMAIN $APP_PORT"

cat <<EOF

All done on Google Cloud.
  Panel:        https://panel.$DOMAIN
  VM:           $VM ($ZONE), IP $IP
  SSH:          gcloud compute ssh $VM --zone $ZONE
  Re-run setup: gcloud compute ssh $VM --zone $ZONE --ssh-flag=-t --command 'sudo bash vm-panel-upload/$name/deploy/setup.sh $DOMAIN $APP_PORT'
EOF
