# Task for Claude Code: deploy and finish the VM Panel

## What this project is
A Node.js (Express) + React panel that runs on ONE Google Cloud VM. One VM = one customer.
- Super admin (account from SUPER_USER / SUPER_PASS) sets the customer's package, RAM, vCPU, disk, external IP, start and expiry dates. These are display values only.
- Customer logs in, sees those values read-only, uploads/deletes files in their own `src/` and `public/` folders, sees the external IP and SSH command.
- When the expiry date passes, uploads/deletes are refused and the dashboard shows "Locked". Optional OS-level lock with ENABLE_OS_LOCK=1 (see README section 5).
- Layout: `server/` (API, serves `client/dist`), `client/` (Vite + React), `nginx.conf`, `README.md`.

## Your job (run on the VM, ask me before anything destructive)
1. Install Node 20, nginx, certbot, pm2 if missing.
2. `cd client && npm i && npm run build`, then `cd ../server && npm i`.
3. Ask me for: domain name, the super admin password. Generate JWT_SECRET with `openssl rand -hex 32`. Never print secrets back or commit them; store them in a root-only env file used by pm2 or systemd.
4. Start the server with pm2 (listens on 127.0.0.1:3000), enable startup on boot.
5. Configure nginx from `nginx.conf` (panel.<domain> -> port 3000, main domain -> the customer's app port). Test with `nginx -t`, reload, then run certbot for both domains.
6. Check that only ports 80 and 443 are public and SSH is limited.
7. Smoke test: log in as super admin, create a customer, log in as the customer, confirm that the customer cannot change config (403) and that an expired plan blocks uploads.

## Optional follow-up
Simplify for a single customer: remove the customers table and "Add customer" flow, so the admin page shows one config form for the one customer. Keep the API checks that stop customers changing config and escaping their folder.

## Rules
- Do not weaken the security checks in `server/index.js` (role checks, path safety, expiry check, rate limit).
- Do not ask for or store my GCP passwords or private keys in chat or files.
