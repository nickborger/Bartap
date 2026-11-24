# Bar Tap camera relay: setup and connecting bar cameras

The relay runs on the same Oracle VM as the website. It takes video from a bar's cameras,
removes the sound, and shows it live in the app. Nothing is recorded.

## Part 1: Turn the relay on (once)

1. Finish ORACLE_SETUP.md first (the website must already open at https://your-domain).
2. Upload this whole project to GitHub, then on the VM get the newest copy:
   `cd ~/Bartap && git pull` (or clone it again).
3. On the VM, run (put in your own domain and Firebase project id):
   `bash deploy/setup-relay.sh your-domain.duckdns.org gen-lang-client-0654676948`
   It takes a few minutes. At the end it says "Done. The camera relay is running."
4. In the Oracle Cloud website, open the video ports:
   Networking > Virtual cloud networks > your VCN > Security Lists > Default Security List >
   Add Ingress Rules. Source CIDR `0.0.0.0/0`. Add four rules:
   TCP 1935, TCP 1936, TCP 8189, UDP 8189.
5. In the app: Admin > (bar) > Cameras. Tick the signage box, add a camera, tap Connect.

After you change files in `relay/`, run step 3 again. It keeps the secret keys and the saved
camera addresses.

## Part 2: Which cameras work

Bar Tap uses the cameras a bar already has. Anything that gives an **RTSP** address works:
Hikvision (and Annke, LTS, Hikvision-built Swann), Dahua (and Amcrest, Lorex), Reolink, Swann,
Uniview, Axis, and other ONVIF cameras. It works with single cameras or with the recorder box
(NVR/DVR) they plug into: one recorder address covers every camera, picked by channel number.
H.264 and H.265 video both pass through. H.264 plays on every phone, so set the camera's
sub stream to H.264 if you can.

### What the bar needs to give you

- The camera or recorder's address on the bar's network (like `192.168.1.64`), or the full
  RTSP address if they know it.
- A username and password for it. Best: make a new **view-only** user just for Bar Tap.
- RTSP turned on in the camera or recorder (usually Network > Advanced or Ports; port 554).
- Which channel numbers are the cameras to show (recorders only).

### Three ways to connect (in the app: Cameras > Connect)

1. **Security cameras + small computer** (safest). Any always-on computer at the bar on the
   same network: a Raspberry Pi or a spare PC running Linux. You paste one command and it
   sends the video out. Nothing is opened on the bar's router.
2. **Straight from the recorder** (no extra hardware). Bar Tap's server connects to the
   recorder over the internet. The bar's router must forward one TCP port to the recorder's
   port 554, and you need the bar's public address or a DDNS name. The app tests the port
   when you tap Save. The camera password is kept only on the relay server
   (`/var/lib/bartap-relay/pulls.json`), never in Firestore. This won't work on internet
   plans that block incoming connections (shared or cellular); use way 1 then.
3. **Streaming app or RTMP**. For recorders or cameras that have an RTMP setting, or
   apps like Larix Broadcaster or OBS.

The same camera rules apply to all three: it only streams while the camera is turned on,
the bar is visible and signage is confirmed, and the sound is always removed.

### Cameras with no RTSP (Ring, Google Nest, many Wyze)

These send video only to their own app and cloud, so Bar Tap can't connect to them, and it
never signs in to those accounts. Options:

- Check for an RTSP setting first. Some models (a few Wyze cameras, for example) can turn
  RTSP on. If yours shows an RTSP address, connect it like any other camera.
- Use a phone or tablet the bar already has: Cameras > Connect > Phone or tablet. An old
  phone on a stand, plugged in, works with no app to install.
- Add one RTSP camera just for Bar Tap and connect it with way 1 or 2.

## If something doesn't work

- Relay logs: `sudo journalctl -u bartap-relay -u bartap-mediamtx -n 50`
- "Saved, but could not reach": the port forward, the public address, or the internet plan.
- Reached, but no picture after a minute: wrong username, password, channel, or RTSP is off.
