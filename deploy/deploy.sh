#!/usr/bin/env bash
# Build Bar Tap and copy it to the Oracle VM from your own computer (Mac, Linux, or Windows with WSL/Git Bash).
# Usage:  ORACLE_HOST=1.2.3.4 ORACLE_USER=ubuntu ORACLE_KEY=~/.ssh/oracle_key bash deploy/deploy.sh
# If you use the GitHub Actions workflow instead, you never need this script.
set -euo pipefail

: "${ORACLE_HOST:?Set ORACLE_HOST to the public IP or domain of the VM}"
ORACLE_USER="${ORACLE_USER:-ubuntu}"
ORACLE_KEY="${ORACLE_KEY:-$HOME/.ssh/id_ed25519}"

cd "$(dirname "$0")/.."
npm ci
npm run lint
npm run build
rsync -az --delete -e "ssh -i $ORACLE_KEY" dist/ "$ORACLE_USER@$ORACLE_HOST:/var/www/bartap/"
echo "Deployed to $ORACLE_HOST"
