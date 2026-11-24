# Hosting Bar Tap on Oracle Cloud (no Google AI Studio)

Bar Tap is a static website: `npm run build` makes a `dist` folder of plain HTML, CSS, JS and images.
An Oracle Cloud Always Free VM serves that folder with **Caddy**, which also gets and renews the HTTPS
certificate by itself. Firebase (sign-in and Firestore) stays exactly as it is; only the hosting moves.

What runs where:

- **GitHub**: your code. Every push to `main` builds the app and copies it to the VM (GitHub Actions).
- **Oracle VM**: Caddy serving `/var/www/bartap` at your domain over HTTPS.
- **Firebase**: sign-in, user profiles, bars, reviews (unchanged).

Files in this repo for hosting:

- `deploy/Caddyfile`: the web server config (HTTPS, single-page-app fallback to `index.html`, caching).
- `deploy/setup-vm.sh`: one-time VM setup (installs Caddy, opens the firewall, writes the config).
- `.github/workflows/deploy-oracle.yml`: build and deploy on every push.
- `deploy/deploy.sh`: deploy from your own computer instead, if you ever want to.

---

## Step 1. Create the VM in the Oracle console

1. Sign in at cloud.oracle.com. Open the menu (top left) > **Compute** > **Instances** > **Create instance**.
2. **Name**: `bartap`.
3. **Image and shape** > **Edit**:
   - **Image**: click **Change image** > **Ubuntu** > pick the newest **Canonical Ubuntu** (22.04 or 24.04).
     If you choose an Ampere (Arm) shape below and the console says the image does not fit, pick the Arm
     (`aarch64`) build of the same Ubuntu version.
   - **Shape**: click **Change shape**. Either one is Always Free and plenty for this site:
     - **Ampere** > `VM.Standard.A1.Flex`, 1 OCPU and 6 GB memory (leaves room for a second VM later), or
     - **Specialty and previous generation** > `VM.Standard.E2.1.Micro` (AMD, 1 GB memory).
     If you get "Out of host capacity", try another **Availability domain** at the top of the page, or try again later.
4. **Networking**: keep **Create new virtual cloud network** and **Create new public subnet**, and make sure
   **Automatically assign public IPv4 address** is on.
5. **Add SSH keys**: you need a key to log in to the VM. The easiest way, even from a phone:
   - In a second browser tab, open the Oracle console and tap the **Cloud Shell** icon (`>_`, top right).
   - In Cloud Shell, run `ssh-keygen -t ed25519 -f ~/.ssh/oracle_vm -N ""` and then `cat ~/.ssh/oracle_vm.pub`.
   - Copy the whole line it prints (starts with `ssh-ed25519`).
   - Back on the create page, choose **Paste public keys** and paste it.
   (On a computer you can instead choose **Generate a key pair for me** and download the private key.)
6. **Boot volume**: leave the default. Tap **Create**.
7. When the state turns green (**Running**), copy the **Public IP address** from the instance page.
   The username for Oracle's Ubuntu images is `ubuntu`.

## Step 2. Open ports 80 and 443 in the Oracle security list

Oracle has two firewalls. This is the first one (in the cloud network). By default only SSH (port 22) is open.

1. On the instance page, under **Primary VNIC**, tap the **Subnet** link.
2. Tap **Security** (or **Security Lists**) > **Default Security List for ...**.
3. Tap **Add Ingress Rules** and fill in:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Destination Port Range**: `80,443`
   - **Description**: Web traffic
4. Tap **Add Ingress Rules**.
5. Optional, for HTTP/3: add one more rule, same source, **IP Protocol** UDP, **Destination Port Range** `443`.

The second firewall (inside the VM, `iptables`) is opened by the setup script in Step 4.

## Step 3. Get a domain name

Google sign-in and HTTPS need a real domain name pointing at the VM. Pick one:

- **Free: DuckDNS.** Go to duckdns.org, sign in (GitHub, Google, etc.), type a name like `bartap`, tap
  **add domain**, then put the VM's **public IP** in the **current ip** box and tap **update ip**.
  Your domain is `bartap.duckdns.org` (whatever name you chose). Keep your DuckDNS token private.
- **Your own domain** (bought at any registrar, e.g. `bartap.com`): in the registrar's DNS settings add an
  **A record**, host `@` (or a subdomain like `app`), value = the VM's public IP. Remove any old AAAA record.

DNS can take a few minutes to update. You can test the server on the bare IP first (Step 4, no domain).

## Step 4. Set up the VM (Caddy + firewall)

1. Log in to the VM. From Oracle **Cloud Shell**:
   ```
   ssh -i ~/.ssh/oracle_vm ubuntu@YOUR_PUBLIC_IP
   ```
   Type `yes` the first time it asks about the fingerprint.
2. Get the project and run the setup script with your domain:
   ```
   git clone https://github.com/nickborger/Bartap.git
   bash Bartap/deploy/setup-vm.sh bartap.duckdns.org
   ```
   Use your own domain in place of `bartap.duckdns.org`. To test on the IP before the domain is ready, run
   `bash Bartap/deploy/setup-vm.sh` with no domain, then run it again with the domain later.

What the script does:

- Installs Caddy from Caddy's official package repository, plus `rsync` and `iptables-persistent`.
- Opens TCP 80, TCP 443 and UDP 443 in `iptables`, inserting them **before** the REJECT rule that Oracle's
  Ubuntu images come with (a rule added after it would never be reached), and saves them so they survive reboots.
  (`ufw` is not used: on Oracle's Ubuntu images the raw iptables rules are what count.)
- Creates `/var/www/bartap`, owned by the `ubuntu` user so deploys can copy files there.
- Writes `/etc/caddy/Caddyfile` with your domain, checks it, and reloads Caddy.

Open `https://your-domain` in a browser. You'll see "Bar Tap server is ready. Waiting for the first deploy."
The first HTTPS certificate can take a minute.

If you prefer to do it by hand, the iptables part is:
```
sudo iptables -L INPUT --line-numbers      # find the line number of the REJECT rule, e.g. 6
sudo iptables -I INPUT 6 -p tcp -m state --state NEW --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp -m state --state NEW --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## Step 5. Let GitHub deploy to the VM

GitHub Actions builds the app and copies `dist` to the VM on every push to `main`. It needs its own SSH key.

1. **On the VM** (still logged in), make a deploy key and allow it to log in:
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C github-deploy
   cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_deploy
   ```
   Copy everything the last command prints, from `-----BEGIN OPENSSH PRIVATE KEY-----` to
   `-----END OPENSSH PRIVATE KEY-----`, including those two lines.
2. **On GitHub**, open the Bartap repo > **Settings** > **Secrets and variables** > **Actions** >
   **New repository secret**, and add three secrets:
   - `ORACLE_HOST`: the VM's public IP (e.g. `129.146.x.x`)
   - `ORACLE_USER`: `ubuntu`
   - `ORACLE_SSH_KEY`: the private key you copied in step 1
3. Make sure `.github/workflows/deploy-oracle.yml` is in the repo (see the upload list), and that
   `package-lock.json` is in the repo too: the workflow's `npm ci` needs it.
4. Go to the **Actions** tab > **Deploy to Oracle Cloud** > **Run workflow** (or just push any change).
   When it turns green, reload your site. From now on every push to `main` deploys by itself.

Until the three secrets exist, the workflow still builds and type-checks the app but skips the copy step.

**Deploying from your own computer instead** (needs Node 22, git and rsync):
```
ORACLE_HOST=YOUR_PUBLIC_IP ORACLE_USER=ubuntu ORACLE_KEY=~/.ssh/oracle_vm bash deploy/deploy.sh
```

## Step 6. Let Google sign-in work on the new domain

1. Firebase console (console.firebase.google.com) > your project (`gen-lang-client-0654676948`) >
   **Authentication** > **Settings** > **Authorized domains** > **Add domain**.
2. Type your domain without `https://`, e.g. `bartap.duckdns.org`, and tap **Add**.
3. Open your site, tap **Sign In** > **Continue with Google**, and check that it works.

The Firebase project ID starts with `gen-lang-client` because AI Studio created it, but it is a normal Firebase
project in your Google account and keeps working without AI Studio.

## Step 7. Retire AI Studio (optional)

Once the Oracle site works and you can sign in on it:

- Stop syncing the repo in AI Studio. You no longer need to redeploy there.
- If AI Studio deployed the app to Cloud Run, you can delete that service in the Google Cloud console
  (**Cloud Run** > select the service > **Delete**) and remove its `*.run.app` address from Firebase
  **Authorized domains**.
- The old GitHub Pages workflow file (`.github/workflows/static.ymlll`) is not needed; delete it.

## Good to know

- **Idle VMs can be reclaimed.** Oracle may reclaim an Always Free VM if, over 7 days, its CPU, network and
  (on Arm) memory use all stay under 20%. A small website can be that quiet. Upgrading the account to
  **Pay As You Go** keeps the Always Free amounts free and avoids idle reclamation; or keep the VM busy
  (the camera relay below would do that). Keep your code in GitHub so you can rebuild the VM any time.
- **Updating the server:** `sudo apt update && sudo apt upgrade -y` now and then. Caddy updates with it.
- **Logs:** `journalctl -u caddy --no-pager | tail -50` shows Caddy's messages (e.g. certificate errors).
- **Changing the Caddy config:** edit `/etc/caddy/Caddyfile`, then `sudo systemctl reload caddy`.

## Later: the camera video relay on the same VM

The cloud relay for bar camera feeds can run on this same VM. Run it on a local port (e.g. `127.0.0.1:8081`)
and let Caddy publish it with HTTPS at a subdomain. The commented `relay...` block at the bottom of
`deploy/Caddyfile` shows how: add a DNS record for the subdomain pointing at the same IP, uncomment the block,
reload Caddy. Open extra ports in both firewalls only if the relay needs ports other than 80/443
(for example RTMP on 1935 from the cameras). For video, the Arm (A1) shape has much more CPU and memory than
the AMD micro shape.

## Troubleshooting

- **Site times out:** a port is still closed. Check the security list rule (Step 2) and run
  `sudo iptables -L INPUT --line-numbers -n`: the ACCEPT lines for 80 and 443 must be above the REJECT line.
- **"Connection refused":** Caddy isn't running. `sudo systemctl status caddy`.
- **Certificate error / no HTTPS:** the domain doesn't point at the VM yet (`dig +short your-domain` should print
  the VM's IP), or port 80 is blocked. Check `journalctl -u caddy`.
- **Google sign-in says the domain is not authorized:** do Step 6.
- **GitHub Action fails at `npm ci`:** `package-lock.json` is missing from the repo; upload it.
- **GitHub Action fails at the copy step:** check the three secrets; the key must include the BEGIN and END lines.
