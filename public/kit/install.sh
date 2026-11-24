#!/usr/bin/env bash
# =============================================================================
# Bar Tap Camera Kit (Linux / Raspberry Pi)
#
# Runs on any always-on Linux computer or Raspberry Pi at the bar, on the same
# network as the cameras. It reads each camera's video over the bar's own
# network (RTSP) and sends it OUT to the Bar Tap relay over an encrypted
# connection. Nothing has to be opened on the bar's router.
#
# The Bar Tap app writes the exact command for each camera. It looks like:
#   curl -fsSL https://YOUR-SITE/kit/install.sh | sudo bash -s -- add CAMERA_ID 'rtsp://...' 'rtmps://...'
#
# Other commands:
#   ... | sudo bash -s -- find               look for cameras on this network
#   ... | sudo bash -s -- status             is the kit running? what is it doing?
#   ... | sudo bash -s -- remove CAMERA_ID   stop sending one camera
#   ... | sudo bash -s -- uninstall          remove the kit completely
#
# NO SOUND: the kit asks the camera for its VIDEO track only (ffmpeg's
# -allowed_media_types video), so the camera never even sends its microphone
# sound to this computer, and nothing with sound is ever sent to Bar Tap.
# Nothing is recorded or saved; video only passes through.
#
# Camera passwords stay on this computer only (in /opt/bartap-kit/cameras,
# readable by root only). They are never sent to Bar Tap.
# =============================================================================
set -euo pipefail

MTX_VERSION="v1.21.4"
KIT_DIR="/opt/bartap-kit"
CAM_DIR="$KIT_DIR/cameras"
SERVICE="bartap-kit"

say()  { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m OK\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mProblem:\033[0m %s\n' "$*" >&2; exit 1; }

need_root() {
  [ "$(id -u)" -eq 0 ] || die "Please run it with sudo (copy the whole command from the Bar Tap app)."
}

yaml_quote() { # single-quoted YAML string
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"
}

install_mediamtx() {
  if [ -x "$KIT_DIR/mediamtx" ] && "$KIT_DIR/mediamtx" --version 2>/dev/null | grep -q "$MTX_VERSION"; then
    return
  fi
  local arch
  case "$(uname -m)" in
    x86_64|amd64) arch=amd64 ;;
    aarch64|arm64) arch=arm64 ;;
    armv7l|armv7*) arch=armv7 ;;
    armv6l) arch=armv6 ;;
    *) die "This computer type ($(uname -m)) isn't supported. Use a Raspberry Pi 3/4/5 or a regular PC." ;;
  esac
  command -v curl >/dev/null || die "curl is missing. Run: sudo apt-get install -y curl"
  say "Downloading the video relay program (MediaMTX $MTX_VERSION, free and open source)..."
  mkdir -p "$KIT_DIR"
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/mtx.tar.gz" \
    "https://github.com/bluenviron/mediamtx/releases/download/${MTX_VERSION}/mediamtx_${MTX_VERSION}_linux_${arch}.tar.gz"
  tar -xzf "$tmp/mtx.tar.gz" -C "$tmp"
  install -m 755 "$tmp/mediamtx" "$KIT_DIR/mediamtx"
  rm -rf "$tmp"
  ok "Video relay program installed"
}

install_ffmpeg() {
  command -v ffmpeg >/dev/null && return
  say "Installing ffmpeg (free; it takes only the video and leaves the sound out)..."
  command -v apt-get >/dev/null || die "Please install ffmpeg first (this computer doesn't have apt-get)."
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg >/dev/null
  ok "ffmpeg installed"
}

write_puller() {
  # Started once per camera by the kit. Asks the camera for VIDEO ONLY and
  # passes it on unchanged to the kit's private relay on this computer.
  cat > "$KIT_DIR/pull-video.sh" <<'PULLER'
#!/usr/bin/env bash
# Usage: pull-video.sh CAMERA_ID   (run by the Bar Tap kit, not by hand)
set -euo pipefail
SRC="$(sed -n 's/^SOURCE=//p' "/opt/bartap-kit/cameras/$1.conf")"
exec ffmpeg -nostdin -hide_banner -loglevel warning \
  -rtsp_transport tcp -allowed_media_types video -i "$SRC" \
  -map 0:v:0 -an -sn -dn -c:v copy \
  -f rtsp -rtsp_transport tcp "rtsp://127.0.0.1:8654/video-$1"
PULLER
  chmod 700 "$KIT_DIR/pull-video.sh"
}

write_config() {
  local cfg="$KIT_DIR/kit.yml"
  {
    echo "# Made by the Bar Tap camera kit. Re-made every time a camera is added or removed."
    echo "logLevel: info"
    echo "# Private, this computer only: ffmpeg drops the sound and hands the video in here."
    echo "rtsp: yes"
    echo "rtspAddress: 127.0.0.1:8654"
    echo "rtspTransports: [tcp]"
    echo "rtmp: no"
    echo "hls: no"
    echo "webrtc: no"
    echo "srt: no"
    echo "moq: no"
    echo "api: no"
    echo "paths:"
    local f id dest
    for f in "$CAM_DIR"/*.conf; do
      [ -e "$f" ] || continue
      id="$(basename "$f" .conf)"
      dest="$(sed -n 's/^DEST=//p' "$f")"
      echo "  video-$id:"
      echo "    source: publisher"
      echo "    runOnInit: $KIT_DIR/pull-video.sh $id"
      echo "    runOnInitRestart: yes"
      echo "    forward:"
      echo "      - dest: $(yaml_quote "$dest")"
    done
  } > "$cfg.tmp"
  chmod 600 "$cfg.tmp"
  mv "$cfg.tmp" "$cfg"
}

write_service() {
  cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=Bar Tap camera kit (sends bar cameras to the Bar Tap relay)
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=$KIT_DIR/mediamtx $KIT_DIR/kit.yml
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "$SERVICE" >/dev/null 2>&1
}

camera_count() { ls "$CAM_DIR"/*.conf 2>/dev/null | wc -l; }

cmd_add() {
  need_root
  local id="${1:-}" src="${2:-}" dest="${3:-}"
  [[ "$id" =~ ^[A-Za-z0-9_-]{1,100}$ ]] || die "Camera ID is missing or has odd characters. Copy the command again from the Bar Tap app."
  [[ "$src" == rtsp://* || "$src" == rtsps://* ]] || die "The camera address must start with rtsp:// (copy the command again from the app)."
  [[ "$dest" == rtmps://* || "$dest" == rtmp://* ]] || die "The Bar Tap link must start with rtmps:// (copy the command again from the app)."
  command -v systemctl >/dev/null || die "This computer doesn't use systemd. Use Raspberry Pi OS, Ubuntu or Debian."

  install_mediamtx
  install_ffmpeg
  write_puller
  mkdir -p "$CAM_DIR"; chmod 700 "$CAM_DIR"

  # Quick check that the camera answers on the bar's network.
  local hostport host port
  hostport="${src#*://}"; hostport="${hostport#*@}"; hostport="${hostport%%/*}"
  host="${hostport%%:*}"; port="${hostport##*:}"; [ "$port" = "$host" ] && port=554
  if timeout 4 bash -c "exec 3<>/dev/tcp/$host/$port" 2>/dev/null; then
    ok "Camera at $host answers"
  else
    printf '\033[1;31m!!\033[0m Can'\''t reach a camera at %s port %s from this computer.\n' "$host" "$port"
    echo "   Check the camera's address (try the 'find' command), that this computer is on the"
    echo "   same network as the cameras, and that RTSP is turned on in the camera's settings."
    echo "   Saving it anyway: the kit keeps trying every few seconds."
  fi

  umask 077
  printf 'SOURCE=%s\nDEST=%s\n' "$src" "$dest" > "$CAM_DIR/$id.conf"
  write_config
  write_service
  systemctl restart "$SERVICE"
  ok "Camera $id saved. The kit starts by itself whenever this computer turns on."

  say "Checking the connection (about 15 seconds)..."
  sleep 15
  local logs; logs="$(journalctl -u "$SERVICE" --since '-20s' --no-pager 2>/dev/null | grep -F "$id" | grep -v 'Bar Tap' || true)"
  if echo "$logs" | grep -viE 'dest' | grep -qiE '401|unauthorized'; then
    echo "Problem: the camera said the username or password is wrong. Fix it in the Bar Tap app and run the new command."
  elif echo "$logs" | grep -viE 'dest' | grep -qiE 'refused|timed out|404 Not Found|Invalid data|No route|exited'; then
    echo "Problem: the camera didn't send video. Check the camera address, brand and channel in the Bar Tap app."
  elif echo "$logs" | grep -qiE 'dest.*(unauthorized|authentication failed)'; then
    echo "Problem: the Bar Tap relay said no. In the app: is the camera turned ON, is the signage box ticked,"
    echo "and did you copy the newest command (making a new key stops old commands)?"
  elif echo "$logs" | grep -qiE 'dest.*(ERR|error|refused|timeout|certificate)|ERR.*dest'; then
    echo "Problem: couldn't reach the Bar Tap relay from this network. Is the internet working here?"
  elif echo "$logs" | grep -qiE 'stream is available'; then
    ok "Camera is sending video. Open the Bar Tap app: it should say Live now within a few seconds."
  else
    echo "Still connecting. Open the Bar Tap app in a minute. If it isn't live, run the 'status' command and"
    echo "send a photo of what it shows to your Bar Tap contact."
  fi
  echo "Cameras on this kit: $(camera_count)"
}

cmd_remove() {
  need_root
  local id="${1:-}"
  [ -f "$CAM_DIR/$id.conf" ] || die "No camera called '$id' on this kit."
  rm -f "$CAM_DIR/$id.conf"
  write_config
  systemctl restart "$SERVICE"
  ok "Camera $id removed. Cameras left: $(camera_count)"
}

cmd_status() {
  echo "Cameras on this kit: $(camera_count)"
  for f in "$CAM_DIR"/*.conf; do [ -e "$f" ] && echo "  - $(basename "$f" .conf)"; done
  systemctl --no-pager --lines=0 status "$SERVICE" 2>/dev/null | sed -n '1,3p' || echo "The kit isn't installed yet."
  echo "--- last messages ---"
  # Hide camera passwords from the output.
  journalctl -u "$SERVICE" -n 25 --no-pager 2>/dev/null | sed -E 's#(rtsps?://)[^@/]+@#\1***@#g; s#(pass=)[A-Za-z0-9]+#\1***#g' || true
}

cmd_find() {
  say "Looking for cameras (RTSP) on this computer's network. This takes about a minute..."
  local nets
  nets="$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | grep -E '/(2[4-9]|3[0-2])$|/(1[6-9]|2[0-3])$' || true)"
  [ -n "$nets" ] || die "Couldn't work out this computer's network."
  local found=0 net base i ip
  for net in $nets; do
    base="$(echo "$net" | cut -d/ -f1 | cut -d. -f1-3)"
    for i in $(seq 1 254); do
      ip="$base.$i"
      ( timeout 1 bash -c "exec 3<>/dev/tcp/$ip/554" 2>/dev/null && echo "  Camera or recorder found at: $ip" ) &
      if (( i % 64 == 0 )); then wait; fi
    done
    wait
  done | tee /tmp/bartap-find.txt
  found="$(grep -c found /tmp/bartap-find.txt || true)"
  if [ "$found" = "0" ]; then
    echo "No cameras answered on port 554. Turn on RTSP in the camera or recorder's settings, then try again."
  else
    echo "Type one of these addresses into the Bar Tap app (Camera address box)."
  fi
}

cmd_uninstall() {
  need_root
  systemctl disable --now "$SERVICE" >/dev/null 2>&1 || true
  rm -f "/etc/systemd/system/$SERVICE.service"
  systemctl daemon-reload || true
  rm -rf "$KIT_DIR"
  ok "Bar Tap camera kit removed from this computer."
}

case "${1:-}" in
  add) shift; cmd_add "$@" ;;
  remove) shift; cmd_remove "$@" ;;
  status) cmd_status ;;
  find) cmd_find ;;
  uninstall) cmd_uninstall ;;
  *) sed -n '2,20p' "$0" 2>/dev/null || true; echo "Use: add | remove | status | find | uninstall" ;;
esac
