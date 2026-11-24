#!/usr/bin/env bash
# One-time setup of an Oracle Cloud VM to host Bar Tap.
# Works on Oracle Linux 9 (user: opc) and Ubuntu (user: ubuntu).
# Run it ON THE VM:   bash setup-vm.sh your-domain.com
# Without a domain:   bash setup-vm.sh        (serves plain http on the VM's IP, for testing only)
set -euo pipefail

DOMAIN="${1:-}"
SITE_DIR=/var/www/bartap
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The Always Free Micro VM has 1 GB of RAM; dnf can run out of memory without swap.
if [ ! -f /swapfile ] && [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 2000 ]; then
  echo "==> Adding a 2 GB swap file (small VM)"
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

if command -v dnf >/dev/null 2>&1; then
  # ---------- Oracle Linux 9 ----------
  echo "==> Installing packages (Caddy, rsync)"
  sudo dnf install -y dnf-plugins-core rsync curl policycoreutils-python-utils
  if ! command -v caddy >/dev/null 2>&1; then
    sudo dnf copr enable -y @caddy/caddy "epel-9-$(uname -m)"
    sudo dnf install -y caddy
  fi

  echo "==> Opening ports 80 and 443 in the VM firewall (firewalld)"
  sudo systemctl enable --now firewalld
  sudo firewall-cmd --permanent --add-service=http
  sudo firewall-cmd --permanent --add-service=https
  sudo firewall-cmd --permanent --add-port=443/udp   # HTTP/3
  sudo firewall-cmd --reload
else
  # ---------- Ubuntu ----------
  echo "==> Installing packages (Caddy, rsync, iptables-persistent)"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg rsync iptables-persistent
  if ! command -v caddy >/dev/null 2>&1; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
    sudo apt-get update -y
    sudo apt-get install -y caddy
  fi

  echo "==> Opening ports 80 and 443 in the VM firewall (iptables)"
  open_port() {
    local proto="$1" port="$2"
    if sudo iptables -C INPUT -p "$proto" -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
      echo "   $proto/$port already open"; return
    fi
    local reject_line
    reject_line=$(sudo iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [ -n "$reject_line" ]; then
      sudo iptables -I INPUT "$reject_line" -p "$proto" -m state --state NEW --dport "$port" -j ACCEPT
    else
      sudo iptables -A INPUT -p "$proto" -m state --state NEW --dport "$port" -j ACCEPT
    fi
    echo "   opened $proto/$port"
  }
  open_port tcp 80
  open_port tcp 443
  open_port udp 443
  sudo netfilter-persistent save
fi

echo "==> Creating $SITE_DIR (owned by $USER so deploys can copy files in)"
sudo mkdir -p "$SITE_DIR"
sudo chown -R "$USER":"$USER" "$SITE_DIR"
sudo chmod 755 "$SITE_DIR"
if [ ! -f "$SITE_DIR/index.html" ]; then
  echo '<!doctype html><title>Bar Tap</title><p>Bar Tap server is ready. Waiting for the first deploy.</p>' > "$SITE_DIR/index.html"
fi

# Oracle Linux runs SELinux: label the site folder so the web server may read it.
if command -v semanage >/dev/null 2>&1 && [ "$(getenforce 2>/dev/null || echo Disabled)" != "Disabled" ]; then
  echo "==> Labelling $SITE_DIR for SELinux"
  sudo semanage fcontext -a -t httpd_sys_content_t "$SITE_DIR(/.*)?" 2>/dev/null || \
    sudo semanage fcontext -m -t httpd_sys_content_t "$SITE_DIR(/.*)?"
  sudo restorecon -R "$SITE_DIR"
fi

echo "==> Writing /etc/caddy/Caddyfile"
if [ -n "$DOMAIN" ]; then
  sed "s/bartap\.example\.com/$DOMAIN/g" "$SCRIPT_DIR/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
else
  sed "s/^bartap\.example\.com {/:80 {/" "$SCRIPT_DIR/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
fi
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable caddy
sudo systemctl restart caddy

PUBLIC_IP=$(curl -s https://ifconfig.me || true)
echo
echo "Done."
if [ -n "$DOMAIN" ]; then
  echo "Open https://$DOMAIN  (the certificate can take a minute the first time)."
else
  echo "Open http://$PUBLIC_IP  to test. Run this script again with your domain for HTTPS."
fi
