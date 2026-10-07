#!/usr/bin/env bash
# Pushes this folder's code to the existing panel VM and rebuilds it. Run it in Cloud Shell:
#   unzip -o vm-panel-v2.zip && bash vm-panel/deploy/gcp-update.sh
# Keeps all data, logins, nginx and HTTPS; creates and deletes nothing on Google Cloud.
# Finds the VM named "vm-panel" in any zone (override with VM=... ZONE=...).
set -euo pipefail

VM=${VM:-vm-panel}
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

say(){ printf '\n\033[1m== %s\033[0m\n' "$*"; }
die(){ printf '\033[31mERROR\033[0m %s\n' "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "Run this in Google Cloud Shell (or anywhere gcloud is installed and logged in)."
[ -f "$SRC/deploy/setup.sh" ] || die "deploy/setup.sh not found next to this script."
ZONE=${ZONE:-$(gcloud compute instances list --filter="name=$VM" --format='value(zone.basename())' | head -1)}
[ -n "$ZONE" ] || die "No VM named '$VM' in project '$(gcloud config get-value project 2>/dev/null)'. Set VM=<name> if you used another name."

say "Uploading the new version to $VM ($ZONE)"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
name=$(basename "$SRC")
tar -C "$(dirname "$SRC")" --exclude=node_modules --exclude="$name/client/dist" --exclude="$name/server/data" \
  -czf "$TMP/vm-panel.tgz" "$name"
gcloud compute scp --zone "$ZONE" --quiet "$TMP/vm-panel.tgz" "$VM:vm-panel.tgz"
# A fresh upload folder, so files deleted from the new version are not carried over from an old upload.
gcloud compute ssh "$VM" --zone "$ZONE" --quiet --ssh-flag=-t \
  --command "rm -rf vm-panel-upload && mkdir vm-panel-upload && tar -xzf vm-panel.tgz -C vm-panel-upload && sudo bash vm-panel-upload/$name/deploy/setup.sh update"
