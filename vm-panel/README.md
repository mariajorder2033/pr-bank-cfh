# VM Panel (Node.js + React)

## 1. Fastest: create everything from Cloud Shell (one command)
Open Cloud Shell in the Google Cloud console, upload the zip (menu > Upload), then:

    unzip -o vm-panel-deshjure.zip && bash vm-panel/deploy/gcp-create.sh yourdomain.com

`deploy/gcp-create.sh` reserves a static IP, opens tcp:80/443 for this VM only, creates an Ubuntu 24.04 VM
(`e2-small` in `asia-south1` by default; override with `REGION=... ZONE=... MACHINE=...`), shows the three DNS
A records to add at your registrar (`@`, `www`, `panel`) and waits until they work, then uploads this folder
and runs `deploy/setup.sh` on the VM. It reuses resources that already exist and never deletes anything.

**Panel on its own small VM, customer apps on separate VMs:** add `panel-only`:

    unzip -o vm-panel-deshjure.zip && bash vm-panel/deploy/gcp-create.sh yourdomain.com panel-only

This creates an `e2-micro` with a 30 GB standard disk in `us-central1` (the shape Google's free tier
covers; check your billing) and only needs the `panel` DNS record. The panel uses ~75 MB RAM; the
one-time client build peaks at ~300-470 MB, so setup.sh adds a 1 GB swap file on VMs under 1.5 GB RAM.
Point `@` and `www` at the app VM instead. On a split setup:
- one panel can serve many customers; put each customer's app VM IP in their "External IP" field
- the expiry lock blocks uploads in the panel, but cannot stop an app running on another VM, and the
  OS lock (section 5) only works for Linux users on the panel's own VM
- files uploaded in the panel stay on the panel VM

If you already have a VM, skip this and use section 2 on the VM instead (DNS A records `@`, `www`, `panel` ->
the VM's static IP; GCP firewall allowing tcp:80 and tcp:443).

## 2. Install (one command, Ubuntu/Debian)
Upload this folder (or its zip) to the VM, then from inside it:

    sudo bash deploy/setup.sh yourdomain.com 8080

The second argument is the port of the customer's own app (default 8080), or `panel-only` when the app runs
on another VM (then only panel.yourdomain.com is set up). The script:
- installs Node.js 22 (Node 20 is end-of-life), nginx and certbot
- copies the panel to /opt/vm-panel (code owned by root) and builds it
- asks for the super admin username and password on the VM, generates JWT_SECRET, and stores them in
  /etc/vm-panel/panel.env (root only, never printed)
- runs the panel as systemd service `vm-panel` under system user `panel` on 127.0.0.1:3000, started on boot
  (systemd instead of pm2, so the secrets file can stay root-only)
- writes the nginx site (panel.yourdomain.com -> panel, yourdomain.com + www -> the app port), checks DNS,
  then gets HTTPS certificates with certbot
- reports public ports and SSH settings, and runs `smoke-test.sh`

Re-running it (e.g. after uploading a new version) keeps the secrets, data, nginx site and certificates.
The super admin account is created on first start from SUPER_USER / SUPER_PASS; changing them later in the
env file does not change an existing account.

Useful commands: `journalctl -u vm-panel -f` (logs), `sudo systemctl restart vm-panel`.

## 3. Smoke test
`smoke-test.sh` creates a throwaway customer and checks that customers cannot change config (403) or leave
their folder, that bad dates are refused, and that an expired plan blocks uploads. It deletes the customer
at the end. The password comes from the environment, not the command line:

    sudo bash -c 'set -a; . /etc/vm-panel/panel.env; bash /opt/vm-panel/smoke-test.sh'

## 4. Roles
- Super admin (/): add customers; set RAM, vCPU, disk, package, IP, start and expiry dates; renew +30 days; delete.
- Customer: sees the same values read-only, uploads/deletes files in their own `src/` and `public/` folders, sees IP and SSH command.
  The server rejects any config change from a customer, and file paths cannot leave the customer's folder.
- Expired plan: upload/delete are refused and the dashboard shows "Locked". Renewing the date unlocks it.
  Dates must be real calendar dates (YYYY-MM-DD); a missing or unreadable expiry date counts as expired.

## 5. Optional: block real SSH on expiry
Customers' SSH accounts must be real Linux users (fill "Server username" in the admin form). Then:
    # the panel runs as user "panel"; allow only these commands without a password:
    echo 'panel ALL=(root) NOPASSWD: /usr/bin/chage, /usr/bin/pkill' | sudo tee /etc/sudoers.d/vm-panel
    echo 'ENABLE_OS_LOCK=1' | sudo tee -a /etc/vm-panel/panel.env && sudo systemctl restart vm-panel
Every hour (and on each save) expired users get `chage -E 0` and their sessions are killed; renewal runs `chage -E -1`.
Only normal login users (UID 1000-60000) are touched; `root`, system accounts and the panel's own user are skipped,
so a typo in "Server username" cannot kill the VM's own processes.

## Notes
- Data lives in /opt/vm-panel/server/data (db.json + sites/), readable only by the `panel` user. Back it up.
- Customer files are stored under server/data/sites/<id>/, separate from their real Linux home. To serve a customer's app from those folders, point their app or nginx at that path.
