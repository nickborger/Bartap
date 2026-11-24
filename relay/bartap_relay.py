#!/usr/bin/env python3
"""Bar Tap camera relay helper.

A tiny web service that sits next to MediaMTX on the Oracle server. It uses
only the Python standard library, so there is nothing to install.

What it does:
  * /auth    MediaMTX asks it "may this connection publish / watch?" (local only).
  * /status  Public: which cameras are live right now, and how many viewers.
  * /keys    Signed-in admins and bar owners get the stream keys and connection
             links for their own bar's cameras.
  * /pull    "Straight from the recorder": owners save the RTSP address of a
             camera or NVR/DVR they already have, and this server pulls the
             video itself. No extra box at the bar, but the bar's router must
             forward one port to the recorder. The address (with its password)
             is kept only on this server, never in Firestore.
  * A reconcile loop that keeps MediaMTX pulling exactly the cameras that are
    allowed to stream (turned on, bar visible, signage confirmed).
  * A watchdog that disconnects a camera within seconds when its owner turns it
    off, makes a new key, or the bar is hidden.

Stream keys are never stored anywhere. Each key is worked out from a secret
that lives only on the server (RELAY_SECRET) plus the bar ID, camera ID and
the camera's key number. Making a new key just bumps the key number in
Firestore, which instantly makes the old key useless.

Settings come from environment variables (see relay.env.example).
"""

import base64
import hashlib
import hmac
import ipaddress
import json
import os
import re
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SECRET = os.environ.get("RELAY_SECRET", "")
PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")
FIRESTORE_BASE = os.environ.get("FIRESTORE_BASE", "https://firestore.googleapis.com/v1").rstrip("/")
PUBLIC_HOST = os.environ.get("PUBLIC_HOST", "localhost")
APP_URL = os.environ.get("APP_URL", f"https://{PUBLIC_HOST}").rstrip("/")
MTX_API = os.environ.get("MTX_API", "http://127.0.0.1:9997").rstrip("/")
LISTEN = os.environ.get("LISTEN", "127.0.0.1:8081")
RTMPS_PORT = int(os.environ.get("RTMPS_PORT", "1936"))
RTMP_PORT = int(os.environ.get("RTMP_PORT", "1935"))
BAR_CACHE_SECONDS = float(os.environ.get("BAR_CACHE_SECONDS", "10"))
WATCHDOG_SECONDS = float(os.environ.get("WATCHDOG_SECONDS", "8"))

ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,100}$")
# Viewers watch bar/<barId>/<cameraId> (video only). Cameras send to
# in/<barId>/<cameraId>, which only the audio stripper on this machine reads.
PATH_RE = re.compile(r"^bar/([A-Za-z0-9_-]{1,100})/([A-Za-z0-9_-]{1,100})$")
IN_RE = re.compile(r"^in/([A-Za-z0-9_-]{1,100})/([A-Za-z0-9_-]{1,100})$")
VIDEO_CODECS = ("H264", "H265", "VP8", "VP9", "AV1", "M-JPEG", "MPEG-4 Video", "MPEG-1/2 Video")
# Password of the audio stripper (ffmpeg on this machine). Must match
# __INTERNAL_KEY__ in /etc/mediamtx/mediamtx.yml (setup-relay.sh does that).
INTERNAL_USER = "bartap-internal"
INTERNAL_KEY = os.environ.get("INTERNAL_KEY", "")
MAX_CAMERAS = 16
# Saved "straight from the recorder" addresses. Readable by the relay only.
PULLS_FILE = os.environ.get("PULLS_FILE", "/var/lib/bartap-relay/pulls.json")
# Only for testing on one machine: lets the server pull from 127.0.0.1 / LAN
# addresses. Never set this on the real server.
ALLOW_PRIVATE_PULL = os.environ.get("ALLOW_PRIVATE_PULL", "") == "1"


def log(*args):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *args, flush=True)


# ---------------------------------------------------------------- keys

def stream_key(bar_id, cam_id, version):
    msg = f"{bar_id}/{cam_id}/{int(version)}".encode()
    return hmac.new(SECRET.encode(), msg, hashlib.sha256).hexdigest()[:32]


def key_version(cam):
    try:
        return int(cam.get("keyVersion") or 0)
    except (TypeError, ValueError):
        return 0


# ---------------------------------------------------------------- Firestore

def decode_value(v):
    if "stringValue" in v:
        return v["stringValue"]
    if "booleanValue" in v:
        return v["booleanValue"]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return float(v["doubleValue"])
    if "nullValue" in v:
        return None
    if "timestampValue" in v:
        return v["timestampValue"]
    if "mapValue" in v:
        return decode_fields(v["mapValue"].get("fields", {}))
    if "arrayValue" in v:
        return [decode_value(x) for x in v["arrayValue"].get("values", [])]
    return None


def decode_fields(fields):
    return {k: decode_value(v) for k, v in fields.items()}


def firestore_get(doc_path, id_token=None):
    """Returns (status_code, data_dict_or_None)."""
    url = f"{FIRESTORE_BASE}/projects/{PROJECT_ID}/databases/(default)/documents/{doc_path}"
    req = urllib.request.Request(url)
    if id_token:
        req.add_header("Authorization", f"Bearer {id_token}")
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            body = json.loads(r.read())
            return 200, decode_fields(body.get("fields", {}))
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:  # network trouble
        log("firestore error", doc_path, e)
        return 599, None


_bar_cache = {}
_bar_lock = threading.Lock()


def get_bar(bar_id, fresh=False):
    """Public bar document (anyone may read bars). Cached for a few seconds.
    Returns the dict, None if it does not exist, or raises on network error."""
    now = time.time()
    with _bar_lock:
        hit = _bar_cache.get(bar_id)
        if hit and not fresh and now - hit[0] < BAR_CACHE_SECONDS:
            return hit[1]
    code, data = firestore_get(f"bars/{bar_id}")
    if code == 200:
        bar = data
    elif code == 404:
        bar = None
    else:
        if hit:  # keep using the last good copy while Firestore is unreachable
            return hit[1]
        raise RuntimeError(f"firestore {code}")
    with _bar_lock:
        _bar_cache[bar_id] = (now, bar)
    return bar


def find_camera(bar, cam_id):
    for cam in (bar or {}).get("cameras") or []:
        if isinstance(cam, dict) and cam.get("id") == cam_id:
            return cam
    return None


def camera_on(cam):
    """Owners turn a camera off by setting its status to STANDBY."""
    return cam is not None and cam.get("status", "LIVE") != "STANDBY"


def bar_visible(bar):
    return bar is not None and bar.get("isActive", True) is not False


def signage_ok(bar):
    p = (bar or {}).get("cameraPrivacy") or {}
    return isinstance(p, dict) and p.get("signageConfirmed") is True


def publish_problem(bar, cam):
    """None when this camera may stream right now, else a short reason."""
    if bar is None:
        return "bar not found (copy built-in bars to Firestore first)"
    if not bar_visible(bar):
        return "bar is hidden"
    if cam is None:
        return "camera not found"
    if not camera_on(cam):
        return "camera is turned off"
    if not signage_ok(bar):
        return "privacy signage not confirmed"
    return None


# ---------------------------------------------------------------- MediaMTX API

def mtx(method, path):
    req = urllib.request.Request(MTX_API + path, method=method)
    with urllib.request.urlopen(req, timeout=5) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def list_paths():
    items, page = [], 0
    while True:
        data = mtx("GET", f"/v3/paths/list?itemsPerPage=200&page={page}")
        items.extend(data.get("items") or [])
        page += 1
        if page >= int(data.get("pageCount") or 1):
            return items


KICK = {
    "rtspSession": "/v3/rtspsessions/kick/",
    "rtspsSession": "/v3/rtspssessions/kick/",
    "rtmpConn": "/v3/rtmpconns/kick/",
    "rtmpsConn": "/v3/rtmpsconns/kick/",
    "webRTCSession": "/v3/webrtcsessions/kick/",
    "srtConn": "/v3/srtconns/kick/",
}


def kick_source(path_item):
    src = path_item.get("source") or {}
    route = KICK.get(src.get("type"))
    if not route or not src.get("id"):
        return False
    try:
        mtx("POST", route + src["id"])
        return True
    except Exception as e:
        log("kick failed", path_item.get("name"), e)
        return False


_status_cache = [0.0, {}]
_status_lock = threading.Lock()


def live_status():
    """{barId: {camId: {live, since, viewers, video}}} for streams that are up."""
    now = time.time()
    with _status_lock:
        if now - _status_cache[0] < 3:
            return _status_cache[1]
    out = {}
    for p in list_paths():
        m = PATH_RE.match(p.get("name", ""))
        if not m or not p.get("ready"):
            continue
        tracks = p.get("tracks") or []
        out.setdefault(m.group(1), {})[m.group(2)] = {
            "live": True,
            "since": p.get("readyTime"),
            "viewers": len(p.get("readers") or []),
            "video": next((t for t in tracks if t in VIDEO_CODECS), None),
        }
    with _status_lock:
        _status_cache[0], _status_cache[1] = now, out
    return out


# ---------------------------------------------------------------- auth hook

# The key number each live stream was let in with, so the watchdog can
# disconnect it as soon as the owner makes a new key.
_admitted = {}


def supplied_key(req):
    for cand in (req.get("password"), req.get("token")):
        if cand:
            return cand.strip()
    q = urllib.parse.parse_qs(req.get("query") or "")
    for name in ("key", "pass"):
        if q.get(name):
            return q[name][0].strip()
    return ""


def is_internal(req):
    return (
        bool(INTERNAL_KEY)
        and req.get("user") == INTERNAL_USER
        and req.get("ip") in ("127.0.0.1", "::1")
        and hmac.compare_digest(req.get("password") or "", INTERNAL_KEY)
    )


# MediaMTX can't answer its API while it is waiting for our auth answer, so
# the auth check uses a copy of the stream list refreshed every 2 seconds.
_tracks_cache = {}


def tracks_loop():
    global _tracks_cache
    while True:
        try:
            _tracks_cache = {p.get("name"): list(p.get("tracks") or []) for p in list_paths()}
        except Exception as e:
            log("track refresh error", e)
        time.sleep(2)


def has_audio_track(path):
    """True if the stream on this path carries anything that isn't video."""
    return any(t not in VIDEO_CODECS for t in _tracks_cache.get(path, []))


def check_auth(req):
    """Returns (allowed: bool, reason: str)."""
    action = req.get("action")
    path = req.get("path") or ""
    if action not in ("publish", "read"):
        return False, f"action {action} not allowed"
    m_in, m_out = IN_RE.match(path), PATH_RE.match(path)
    internal = is_internal(req)
    # The audio stripper: reads in/..., publishes the video-only bar/... copy.
    if internal:
        if (action == "read" and m_in) or (action == "publish" and m_out):
            return True, "ok"
        return False, "internal user can't do that"
    if action == "read" and m_in:
        return False, "the camera's raw stream is private"
    if action == "publish" and m_out:
        return False, "send to the in/ address from the Bar Tap app"
    m = m_in or m_out
    if not m:
        return False, "unknown path"
    bar_id, cam_id = m.group(1), m.group(2)
    try:
        bar = get_bar(bar_id, fresh=(action == "publish"))
    except Exception as e:
        return False, f"lookup failed: {e}"
    cam = find_camera(bar, cam_id)
    if action == "read":
        if not (bar_visible(bar) and camera_on(cam)):
            return False, "camera not available"
        # Last safety net: never let anyone watch a stream with a sound track.
        # (The stripper makes that impossible; this is belt and braces.)
        if has_audio_track(path):
            return False, "stream has sound, refusing"
        return True, "ok"
    problem = publish_problem(bar, cam)
    if problem:
        return False, problem
    version = key_version(cam)
    if not hmac.compare_digest(supplied_key(req), stream_key(bar_id, cam_id, version)):
        return False, "wrong stream key"
    _admitted[path] = version
    return True, "ok"


# ---------------------------------------------------------------- watchdog

def watchdog_once():
    for p in list_paths():
        name = p.get("name", "")
        m = IN_RE.match(name)
        if not m or not p.get("ready"):
            if PATH_RE.match(name) and p.get("ready") and any(t not in VIDEO_CODECS for t in (p.get("tracks") or [])):
                kick_source(p)  # should never happen: a viewer stream with sound
                log("disconnected", name, "- had a sound track")
            continue
        try:
            bar = get_bar(m.group(1))
        except Exception:
            continue  # Firestore unreachable: leave streams alone
        cam = find_camera(bar, m.group(2))
        problem = publish_problem(bar, cam)
        if not problem and name in _admitted and _admitted[name] != key_version(cam):
            problem = "stream key was replaced"
        if problem and kick_source(p):
            _admitted.pop(name, None)
            log("disconnected", name, "-", problem)


def watchdog_loop():
    while True:
        time.sleep(WATCHDOG_SECONDS)
        try:
            watchdog_once()
        except Exception as e:
            log("watchdog error", e)


# ---------------------------------------------------------------- /keys

def jwt_claims(token):
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except Exception:
        return None


def connection_info(bar_id, cam):
    cam_id = cam["id"]
    path = f"in/{bar_id}/{cam_id}"
    key = stream_key(bar_id, cam_id, key_version(cam))
    token = base64.urlsafe_b64encode(f"{bar_id}|{cam_id}|{key}".encode()).decode().rstrip("=")
    h = PUBLIC_HOST
    return {
        "id": cam_id,
        "name": cam.get("name") or cam_id,
        "path": path,
        "key": key,
        "keyVersion": key_version(cam),
        "on": camera_on(cam),
        # rtmpsFullUrl: used by the camera kit (computer / Raspberry Pi at the
        # bar). Server + stream key: streaming apps (Larix, OBS) and NVRs.
        # Apps join these as <server>/<stream key>, giving the same address.
        "rtmpsServer": f"rtmps://{h}:{RTMPS_PORT}/in/{bar_id}",
        "rtmpServer": f"rtmp://{h}:{RTMP_PORT}/in/{bar_id}",
        "rtmpStreamKey": f"{cam_id}?user=bartap&pass={key}",
        "rtmpsFullUrl": f"rtmps://{h}:{RTMPS_PORT}/{path}?user=bartap&pass={key}",
        "rtmpFullUrl": f"rtmp://{h}:{RTMP_PORT}/{path}?user=bartap&pass={key}",
        # Phone or tablet: open this link, tap Start.
        "goLiveLink": f"{APP_URL}/go-live#t={token}",
        "whip": f"{APP_URL}/relay/rtc/{path}/whip",
        # "Straight from the recorder": the saved address with the password hidden.
        "direct": mask_url(load_pulls().get(f"{bar_id}/{cam_id}", "")) or None,
    }


def authorize_owner(id_token, bar_id):
    """(None, None) when this signed-in person is the bar's owner or an admin,
    else (status_code, error_dict)."""
    if not ID_RE.match(bar_id or ""):
        return 400, {"error": "bad bar id"}
    claims = jwt_claims(id_token or "")
    if not claims:
        return 401, {"error": "sign in first"}
    uid = claims.get("user_id") or claims.get("sub")
    if not uid or not ID_RE.match(uid) or claims.get("aud") != PROJECT_ID:
        return 401, {"error": "sign in first"}
    if float(claims.get("exp") or 0) < time.time():
        return 401, {"error": "sign-in expired, reload the page"}
    # Reading your own users/{uid} document with your own sign-in proves who
    # you are: Firestore checks the token's signature and the rules only let
    # you read your own document.
    code, profile = firestore_get(f"users/{uid}", id_token)
    if code in (401, 403):
        return 401, {"error": "sign in first"}
    if code != 200 or profile is None:
        return 403, {"error": "no Bar Tap profile for this account"}
    # Same test as ownsBar() / isAdmin() in firestore.rules.
    role = profile.get("role") or "user"
    is_admin = role == "admin"
    owns = role in ("owner", "admin") and bar_id in (profile.get("ownedBarIds") or [])
    if not (is_admin or owns):
        return 403, {"error": "only this bar's owner or an admin can manage its cameras"}
    return None, None


def handle_keys(id_token, bar_id):
    code, err = authorize_owner(id_token, bar_id)
    if code:
        return code, err
    try:
        bar = get_bar(bar_id, fresh=True)
    except Exception:
        return 502, {"error": "could not reach the database, try again"}
    if bar is None:
        return 404, {"error": "bar not found in Firestore (Admin > Copy built-in bars to Firestore)"}
    cams = [c for c in (bar.get("cameras") or []) if isinstance(c, dict) and ID_RE.match(str(c.get("id", "")))]
    return 200, {
        "barId": bar_id,
        "host": PUBLIC_HOST,
        "signageConfirmed": signage_ok(bar),
        "cameras": [connection_info(bar_id, c) for c in cams[:MAX_CAMERAS]],
    }


# ---------------------------------------------------------------- /pull
# "Straight from the recorder": this server connects to the bar's camera or
# NVR/DVR over RTSP (through one forwarded port on the bar's router) and pulls
# the video itself. Same rules as every other camera: it only runs while the
# camera is turned on, the bar is visible and signage is confirmed, and the
# sound is stripped before anyone can watch.

_pulls_lock = threading.Lock()
_applied = {}  # pathName -> address we last gave MediaMTX
RTSP_URL_RE = re.compile(r"^rtsps?://[^\s'\"<>\\]{3,900}$")


def load_pulls():
    try:
        with open(PULLS_FILE) as f:
            data = json.load(f)
        return {k: v for k, v in data.items() if isinstance(k, str) and isinstance(v, str)}
    except FileNotFoundError:
        return {}
    except Exception as e:
        log("could not read", PULLS_FILE, e)
        return {}


def save_pulls(pulls):
    os.makedirs(os.path.dirname(PULLS_FILE) or ".", exist_ok=True)
    tmp = PULLS_FILE + ".tmp"
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(pulls, f, indent=1)
    os.replace(tmp, PULLS_FILE)


def mask_url(url):
    """rtsp://user:secret@host/... -> rtsp://user:****@host/..."""
    return re.sub(r"^(rtsps?://[^:@/]*):[^@/]*@", r"\1:****@", url or "")


def url_host_port(url):
    u = urllib.parse.urlsplit(url)
    return u.hostname, (u.port or (322 if u.scheme == "rtsps" else 554))


def public_address_problem(host, port):
    """None if host resolves only to public internet addresses, else a reason.
    Stops anyone using the relay to poke at this server or Oracle's network."""
    if not host:
        return "the address has no host name or IP"
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return f"can't find {host} on the internet (check the spelling or the DDNS name)"
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if ALLOW_PRIVATE_PULL:
            continue
        if not ip.is_global:
            return (f"{host} is a private address ({ip}). Bar Tap's server is on the internet, so it needs the "
                    "bar's PUBLIC address or DDNS name, with a port forwarded to the recorder")
    return None


def can_connect(host, port, timeout=5):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def pull_conf(bar_id, cam_id, url):
    stripper = (
        "ffmpeg -nostdin -hide_banner -loglevel error -rtsp_transport tcp -allowed_media_types video "
        f"-i rtsp://{INTERNAL_USER}:{INTERNAL_KEY}@127.0.0.1:8554/in/{bar_id}/{cam_id} "
        "-map 0:v:0 -an -sn -dn -c:v copy -f rtsp -rtsp_transport tcp "
        f"rtsp://{INTERNAL_USER}:{INTERNAL_KEY}@127.0.0.1:8554/bar/{bar_id}/{cam_id}"
    )
    return {
        "source": url,
        "rtspTransport": "tcp",
        "sourceOnDemand": False,
        "record": False,
        "runOnReady": stripper,
        "runOnReadyRestart": True,
    }


def mtx_json(method, path, body):
    req = urllib.request.Request(MTX_API + path, method=method, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as r:
        r.read()


def configured_pulls():
    """{pathName: source} for the pull paths MediaMTX is running now."""
    out, page = {}, 0
    while True:
        data = mtx("GET", f"/v3/config/paths/list?itemsPerPage=200&page={page}")
        for p in data.get("items") or []:
            if IN_RE.match(p.get("name", "")):
                out[p["name"]] = p.get("source")
        page += 1
        if page >= int(data.get("pageCount") or 1):
            return out


_reconcile_lock = threading.Lock()


def reconcile_pulls():
    with _reconcile_lock:
        _reconcile_pulls()


def _reconcile_pulls():
    with _pulls_lock:
        pulls = load_pulls()
    want = {}
    for key, url in pulls.items():
        bar_id, _, cam_id = key.partition("/")
        try:
            bar = get_bar(bar_id)
        except Exception:
            return  # Firestore unreachable: change nothing
        if publish_problem(bar, find_camera(bar, cam_id)) is None:
            want[f"in/{bar_id}/{cam_id}"] = (bar_id, cam_id, url)
    # MediaMTX hides the login in the addresses it lists, so remember what we
    # gave it instead of comparing with what it shows.
    have = configured_pulls()
    for name, (bar_id, cam_id, url) in want.items():
        if name not in have:
            mtx_json("POST", f"/v3/config/paths/add/{name}", pull_conf(bar_id, cam_id, url))
            _applied[name] = url
            log("direct pull started", name, mask_url(url))
        elif _applied.get(name) != url:
            mtx_json("POST", f"/v3/config/paths/replace/{name}", pull_conf(bar_id, cam_id, url))
            _applied[name] = url
            log("direct pull changed", name, mask_url(url))
    for name in have:
        if name not in want:
            mtx("DELETE", f"/v3/config/paths/delete/{name}")
            _applied.pop(name, None)
            log("direct pull stopped", name)


def pulls_loop():
    while True:
        try:
            reconcile_pulls()
        except Exception as e:
            log("direct pull error", e)
        time.sleep(WATCHDOG_SECONDS)


def handle_pull(id_token, body):
    bar_id = str(body.get("barId") or "")
    cam_id = str(body.get("cameraId") or "")
    url = str(body.get("url") or "").strip()
    code, err = authorize_owner(id_token, bar_id)
    if code:
        return code, err
    if not ID_RE.match(cam_id):
        return 400, {"error": "bad camera id"}
    try:
        bar = get_bar(bar_id, fresh=True)
    except Exception:
        return 502, {"error": "could not reach the database, try again"}
    if find_camera(bar, cam_id) is None:
        return 404, {"error": "camera not found"}
    key = f"{bar_id}/{cam_id}"
    if not url:  # stop pulling this camera
        with _pulls_lock:
            pulls = load_pulls()
            pulls.pop(key, None)
            save_pulls(pulls)
        try:
            reconcile_pulls()
        except Exception as e:
            log("direct pull error", e)
        return 200, {"ok": True, "direct": None}
    if not RTSP_URL_RE.match(url):
        return 400, {"error": "the address must start with rtsp:// (or rtsps://) and have no spaces"}
    host, port = url_host_port(url)
    problem = public_address_problem(host, port)
    if problem:
        return 400, {"error": problem}
    reachable = can_connect(host, port)
    with _pulls_lock:
        pulls = load_pulls()
        pulls[key] = url
        save_pulls(pulls)
    try:
        reconcile_pulls()
    except Exception as e:
        log("direct pull error", e)
    log("direct pull saved", key, mask_url(url), "reachable" if reachable else "NOT reachable")
    return 200, {
        "ok": True,
        "direct": mask_url(url),
        "reachable": reachable,
        "checked": f"{host}:{port}",
        "problem": publish_problem(bar, find_camera(bar, cam_id)),
    }


# ---------------------------------------------------------------- HTTP

class Handler(BaseHTTPRequestHandler):
    server_version = "BarTapRelay/1"

    def log_message(self, fmt, *args):
        pass

    def send_json(self, code, obj, cache="no-store"):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", cache)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 65536:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return {}

    def route(self):
        # Caddy forwards /relay/api/* here with the prefix removed.
        return urllib.parse.urlparse(self.path)

    def do_GET(self):
        u = self.route()
        if u.path == "/health":
            return self.send_json(200, {"ok": True})
        if u.path == "/status":
            try:
                bars = live_status()
            except Exception:
                return self.send_json(503, {"error": "relay offline"})
            bar = urllib.parse.parse_qs(u.query).get("bar", [None])[0]
            if bar:
                return self.send_json(200, {"bar": bar, "cameras": bars.get(bar, {})}, "public, max-age=3")
            return self.send_json(200, {"bars": bars}, "public, max-age=3")
        self.send_json(404, {"error": "not found"})

    def do_POST(self):
        u = self.route()
        if u.path == "/auth":
            # Only MediaMTX on this same machine may ask. Caddy never forwards
            # /auth (and it would arrive with X-Forwarded-For if it did).
            if self.client_address[0] not in ("127.0.0.1", "::1") or self.headers.get("X-Forwarded-For"):
                return self.send_json(403, {"error": "forbidden"})
            req = self.read_json()
            ok, reason = check_auth(req)
            if req.get("action") == "publish" or not ok:
                log("auth", req.get("action"), req.get("protocol"), req.get("path"), req.get("ip"), "->", "OK" if ok else f"DENIED ({reason})")
            return self.send_json(200 if ok else 401, {"ok": ok, "reason": reason})
        if u.path == "/keys":
            auth = self.headers.get("Authorization") or ""
            token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
            body = self.read_json()
            code, obj = handle_keys(token, str(body.get("barId") or ""))
            return self.send_json(code, obj)
        if u.path == "/pull":
            auth = self.headers.get("Authorization") or ""
            token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
            code, obj = handle_pull(token, self.read_json())
            return self.send_json(code, obj)
        self.send_json(404, {"error": "not found"})


def main():
    if len(SECRET) < 32:
        sys.exit("RELAY_SECRET must be set (at least 32 characters). See relay.env.example.")
    if len(INTERNAL_KEY) < 32:
        sys.exit("INTERNAL_KEY must be set (at least 32 characters). See relay.env.example.")
    if not PROJECT_ID:
        sys.exit("FIREBASE_PROJECT_ID must be set.")
    threading.Thread(target=watchdog_loop, daemon=True).start()
    threading.Thread(target=tracks_loop, daemon=True).start()
    threading.Thread(target=pulls_loop, daemon=True).start()
    host, port = LISTEN.rsplit(":", 1)
    log(f"Bar Tap relay helper on {LISTEN} for project {PROJECT_ID}, public host {PUBLIC_HOST}")
    ThreadingHTTPServer((host, int(port)), Handler).serve_forever()


if __name__ == "__main__":
    main()
