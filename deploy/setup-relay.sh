#!/usr/bin/env bash
# One-time setup of the Bar Tap camera relay on the same Oracle VM as the website.
# Run setup-vm.sh first (it installs Caddy and gets the HTTPS certificate).
# Run it ON THE VM, from the Bartap folder:
#     bash deploy/setup-relay.sh your-domain.com your-firebase-project-id
# Safe to run again (for example after you change relay/ files): it keeps the
# secret keys and the saved camera addresses.
set -euo pipefail

DOMAIN="${1:-}"
PROJECT_ID="${2:-}"
MTX_VERSION=v1.21.4
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR=/opt/bartap-relay
ENV_FILE=/etc/bartap-relay/relay.env
MTX_CONF=/etc/mediamtx/mediamtx.yml
DATA_DIR=/var/lib/bartap-relay

if [ -z "$DOMAIN" ] || [ -z "$PROJECT_ID" ]; then
  echo "Usage: bash deploy/setup-relay.sh your-domain.com your-firebase-project-id"
  echo "(The project id is projectId in your Firebase web config, e.g. gen-lang-client-0123456789.)"
  exit 1
fi
command -v caddy >/dev/null || { echo "Run deploy/setup-vm.sh $DOMAIN first."; exit 1; }

case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "This server type ($(uname -m)) isn't supported."; exit 1 ;;
esac

echo "==> Installing tools (python3, curl, openssl, xz)"
if command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y python3 curl openssl xz tar >/dev/null
else
  sudo apt-get update -y >/dev/null
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3 curl openssl xz-utils tar >/dev/null
fi

echo "==> Creating the bartap-relay system user and folders"
id bartap-relay >/dev/null 2>&1 || sudo useradd --system --no-create-home --shell /usr/sbin/nologin bartap-relay
sudo mkdir -p "$APP_DIR/bin" /etc/bartap-relay /etc/mediamtx/certs "$DATA_DIR"
sudo chown bartap-relay:bartap-relay "$DATA_DIR"
sudo chmod 700 "$DATA_DIR"

if ! "$APP_DIR/mediamtx" --version 2>/dev/null | grep -q "$MTX_VERSION"; then
  echo "==> Downloading MediaMTX $MTX_VERSION (free, open source video server)"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/mtx.tar.gz" \
    "https://github.com/bluenviron/mediamtx/releases/download/${MTX_VERSION}/mediamtx_${MTX_VERSION}_linux_${ARCH}.tar.gz"
  tar -xzf "$tmp/mtx.tar.gz" -C "$tmp"
  sudo install -m 755 "$tmp/mediamtx" "$APP_DIR/mediamtx"
  rm -rf "$tmp"
fi

if [ ! -x "$APP_DIR/bin/ffmpeg" ]; then
  echo "==> Downloading ffmpeg (removes the sound before anyone can watch)"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/ff.tar.xz" "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${ARCH}-static.tar.xz"
  tar -xJf "$tmp/ff.tar.xz" -C "$tmp"
  sudo install -m 755 "$tmp"/ffmpeg-*-static/ffmpeg "$APP_DIR/bin/ffmpeg"
  rm -rf "$tmp"
fi

echo "==> Installing the Bar Tap relay helper"
sudo install -m 644 "$REPO_DIR/relay/bartap_relay.py" "$APP_DIR/bartap_relay.py"

echo "==> Writing $ENV_FILE (keeps existing secret keys)"
old() { sudo sed -n "s/^$1=//p" "$ENV_FILE" 2>/dev/null | head -n1; }
RELAY_SECRET="$(old RELAY_SECRET)"; [ -n "$RELAY_SECRET" ] || RELAY_SECRET="$(openssl rand -hex 32)"
INTERNAL_KEY="$(old INTERNAL_KEY)"; [ -n "$INTERNAL_KEY" ] || INTERNAL_KEY="$(openssl rand -hex 24)"
sudo tee "$ENV_FILE" >/dev/null <<EOF
# Bar Tap relay settings. Keep this file private: anyone with RELAY_SECRET can make stream keys.
RELAY_SECRET=$RELAY_SECRET
INTERNAL_KEY=$INTERNAL_KEY
FIREBASE_PROJECT_ID=$PROJECT_ID
PUBLIC_HOST=$DOMAIN
APP_URL=https://$DOMAIN
PULLS_FILE=$DATA_DIR/pulls.json
EOF
sudo chown root:bartap-relay "$ENV_FILE"
sudo chmod 640 "$ENV_FILE"

echo "==> Writing $MTX_CONF"
sed -e "s/__PUBLIC_HOST__/$DOMAIN/g" -e "s/__INTERNAL_KEY__/$INTERNAL_KEY/g" "$REPO_DIR/relay/mediamtx.yml" | sudo tee "$MTX_CONF" >/dev/null
sudo chown root:bartap-relay "$MTX_CONF"
sudo chmod 640 "$MTX_CONF"

echo "==> Certificate for RTMPS (the same free one Caddy gets for $DOMAIN)"
sudo tee /usr/local/bin/bartap-relay-certs >/dev/null <<EOF
#!/usr/bin/env bash
# Copies Caddy's certificate for $DOMAIN to MediaMTX, and restarts it when it changed.
set -euo pipefail
src=\$(find /var/lib/caddy -type f -name "$DOMAIN.crt" 2>/dev/null | head -n1 || true)
if [ -z "\$src" ]; then
  if [ ! -f /etc/mediamtx/certs/server.crt ]; then
    # No certificate from Caddy yet: a temporary one so MediaMTX can start.
    openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=$DOMAIN" \\
      -keyout /etc/mediamtx/certs/server.key -out /etc/mediamtx/certs/server.crt 2>/dev/null
    chown bartap-relay:bartap-relay /etc/mediamtx/certs/server.*; chmod 600 /etc/mediamtx/certs/server.key
  fi
  exit 0
fi
key="\${src%.crt}.key"
if ! cmp -s "\$src" /etc/mediamtx/certs/server.crt; then
  install -m 644 -o bartap-relay -g bartap-relay "\$src" /etc/mediamtx/certs/server.crt
  install -m 600 -o bartap-relay -g bartap-relay "\$key" /etc/mediamtx/certs/server.key
  systemctl try-restart bartap-mediamtx || true
fi
EOF
sudo chmod 755 /usr/local/bin/bartap-relay-certs
for i in $(seq 1 24); do
  sudo find /var/lib/caddy -type f -name "$DOMAIN.crt" 2>/dev/null | grep -q . && break
  [ "$i" = 1 ] && echo "   waiting for Caddy's certificate (up to 2 minutes)..."
  sleep 5
done
sudo /usr/local/bin/bartap-relay-certs

echo "==> Installing the services (start on boot, restart if they stop)"
sudo tee /etc/systemd/system/bartap-relay.service >/dev/null <<EOF
[Unit]
Description=Bar Tap relay helper (stream keys, camera rules, direct camera pulls)
After=network-online.target
Wants=network-online.target

[Service]
User=bartap-relay
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/python3 $APP_DIR/bartap_relay.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo tee /etc/systemd/system/bartap-mediamtx.service >/dev/null <<EOF
[Unit]
Description=Bar Tap video relay (MediaMTX)
After=bartap-relay.service network-online.target
Wants=bartap-relay.service network-online.target

[Service]
User=bartap-relay
Environment=PATH=$APP_DIR/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$APP_DIR/mediamtx $MTX_CONF
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
sudo tee /etc/systemd/system/bartap-relay-certs.service >/dev/null <<EOF
[Unit]
Description=Copy Caddy's certificate to the Bar Tap video relay

[Service]
Type=oneshot
ExecStart=/usr/local/bin/bartap-relay-certs
EOF
sudo tee /etc/systemd/system/bartap-relay-certs.timer >/dev/null <<EOF
[Unit]
Description=Check the relay certificate twice a day

[Timer]
OnBootSec=2min
OnUnitActiveSec=12h

[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now bartap-relay-certs.timer >/dev/null
sudo systemctl enable bartap-relay bartap-mediamtx >/dev/null
sudo systemctl restart bartap-relay
sleep 1
sudo systemctl restart bartap-mediamtx

echo "==> Opening the video ports in the VM firewall (TCP 1935, 1936, 8189 and UDP 8189)"
if command -v firewall-cmd >/dev/null 2>&1 && sudo systemctl is-active --quiet firewalld; then
  for p in 1935/tcp 1936/tcp 8189/tcp 8189/udp; do sudo firewall-cmd --permanent --add-port=$p >/dev/null; done
  sudo firewall-cmd --reload >/dev/null
else
  open_port() {
    local proto="$1" port="$2"
    sudo iptables -C INPUT -p "$proto" -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null && return
    local reject_line
    reject_line=$(sudo iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [ -n "$reject_line" ]; then
      sudo iptables -I INPUT "$reject_line" -p "$proto" -m state --state NEW --dport "$port" -j ACCEPT
    else
      sudo iptables -A INPUT -p "$proto" -m state --state NEW --dport "$port" -j ACCEPT
    fi
  }
  open_port tcp 1935; open_port tcp 1936; open_port tcp 8189; open_port udp 8189
  command -v netfilter-persistent >/dev/null && sudo netfilter-persistent save >/dev/null
fi

echo "==> Making sure Caddy sends /relay/... to the relay"
if ! sudo grep -q "/relay/api/" /etc/caddy/Caddyfile; then
  sed "s/bartap\.example\.com/$DOMAIN/g" "$REPO_DIR/deploy/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
fi
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
sudo systemctl reload caddy

sleep 3
if curl -fsS "https://$DOMAIN/relay/api/status?bar=test" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:8081/status?bar=test" >/dev/null; then
  echo
  echo "Done. The camera relay is running."
else
  echo
  echo "The relay did not answer. Look at:  sudo journalctl -u bartap-relay -u bartap-mediamtx -n 50"
fi
echo "Last step, in the Oracle Cloud website: add ingress rules for TCP 1935, 1936, 8189 and UDP 8189"
echo "(Networking > Virtual cloud networks > your VCN > Security Lists > Default > Add Ingress Rules, source 0.0.0.0/0)."
