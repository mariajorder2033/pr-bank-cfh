# VM Panel (Node.js + React)

## 1. Install on the VM (Ubuntu)
    sudo apt install -y nginx certbot python3-certbot-nginx
    # Node 20+ required
    cd client && npm i && npm run build && cd ../server && npm i

## 2. Run (keep it alive with pm2)
    export JWT_SECRET="$(openssl rand -hex 32)"
    export SUPER_USER=superadmin
    export SUPER_PASS='choose-a-long-password'
    sudo npm i -g pm2 && pm2 start index.js --name vm-panel && pm2 save && pm2 startup
The super admin account is created on first start from SUPER_USER / SUPER_PASS.
Keep the JWT_SECRET the same on every restart (put it in a pm2 ecosystem file or systemd unit).

## 3. Domain + HTTPS
1. Reserve a static external IP for the VM in GCP.
2. DNS A records: `panel` and `@` (and `www`) -> that IP.
3. Copy nginx.conf to /etc/nginx/sites-available/vm-panel, edit domain names, enable it, `sudo nginx -t && sudo systemctl reload nginx`.
4. `sudo certbot --nginx -d panel.yourdomain.com -d yourdomain.com`
5. GCP firewall: open only 80 and 443 (plus SSH from your own IPs).

## 4. Roles
- Super admin (/): add customers; set RAM, vCPU, disk, package, IP, start and expiry dates; renew +30 days; delete.
- Customer: sees the same values read-only, uploads/deletes files in their own `src/` and `public/` folders, sees IP and SSH command.
  The server rejects any config change from a customer, and file paths cannot leave the customer's folder.
- Expired plan: upload/delete are refused and the dashboard shows "Locked". Renewing the date unlocks it.

## 5. Optional: block real SSH on expiry
Customers' SSH accounts must be real Linux users (fill "Server username" in the admin form). Then:
    # run the panel as user "panel", and allow only these commands without a password:
    echo 'panel ALL=(root) NOPASSWD: /usr/bin/chage, /usr/bin/pkill' | sudo tee /etc/sudoers.d/vm-panel
    ENABLE_OS_LOCK=1 pm2 restart vm-panel --update-env
Every hour (and on each save) expired users get `chage -E 0` and their sessions are killed; renewal runs `chage -E -1`.

## Notes
- Data lives in server/data (db.json + sites/). Back it up.
- Customer files are stored under server/data/sites/<id>/, separate from their real Linux home. To serve a customer's app from those folders, point their app or nginx at that path.
