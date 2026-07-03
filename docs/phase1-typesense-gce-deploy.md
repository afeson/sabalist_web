# Phase 1 — Typesense on Google Cloud: Complete Deployment Guide

**Audience:** someone who has never used Google Cloud. Every step is spelled out.
**What you're building:** a small always-on server (a "VM") running the Typesense
search engine, reachable securely over HTTPS at `https://search.sabalist.com`, with
automatic TLS, daily backups, monitoring, and a locked-down firewall.
**Time:** ~45–60 minutes the first time.
**Cost:** ~$13–20/month (one small VM + disk + static IP). Full breakdown at the end.

> You will run commands in **two places**:
> - **Cloud Shell** (a free Linux terminal in your browser, inside Google Cloud) — for
>   creating cloud resources.
> - **The VM itself** (you SSH into it) — for installing Docker + Typesense.
> Each command block is labelled `# [Cloud Shell]` or `# [On the VM]`.

At the very end you'll send me two things — the **endpoint URL** and the **admin key** —
and I take over the rest of Phase 1 (loading data, wiring the website).

---

## Part 0 — One-time Google Cloud account setup

### 0.1 Create/confirm your Google Cloud account
1. Go to <https://console.cloud.google.com> and sign in with your Google account.
2. If it's your first time, accept the terms. New accounts get **$300 free credit** — this
   whole phase fits inside that.

### 0.2 Confirm the project exists and billing is on
Your Firebase project `sabalist` **is** a Google Cloud project — we'll deploy into it.
1. Top-left, click the **project picker** and select **`sabalist`** (or search for it).
2. Left menu (☰) → **Billing**. Confirm a billing account is linked. If it says "This
   project has no billing account," click **Link a billing account** and add one (a card).
   Nothing is charged beyond usage; the free credit covers you first.

### 0.3 Open Cloud Shell (your terminal)
1. Top-right of the console, click the **terminal icon** `>_` ("Activate Cloud Shell").
2. A black terminal opens at the bottom. If asked to authorize, click **Authorize**.
3. Set your project and region as the default so you don't retype them:
   ```bash
   # [Cloud Shell]
   gcloud config set project sabalist
   gcloud config set compute/region us-central1
   gcloud config set compute/zone us-central1-a
   ```
4. Enable the services we'll use (safe to run; does nothing if already enabled):
   ```bash
   # [Cloud Shell]
   gcloud services enable compute.googleapis.com monitoring.googleapis.com logging.googleapis.com
   ```
   This can take 1–2 minutes. ✅ **Checkpoint:** it finishes with no red error.

> **Region note:** we use `us-central1` (Iowa) — cheap and reliable. If most of your users
> are in Africa/Europe, you *could* use `europe-west1`; keep it consistent everywhere below.

---

## Part 1 — Reserve a static IP address

A VM's IP normally changes if it restarts. DNS needs a **fixed** IP, so we reserve one.

```bash
# [Cloud Shell]
gcloud compute addresses create sabalist-search-ip --region=us-central1
gcloud compute addresses describe sabalist-search-ip --region=us-central1 --format='value(address)'
```
The second command prints an IP like `34.72.xxx.xxx`. **Write this down — this is `SEARCH_IP`.**
You'll use it for DNS (Part 4) and the VM (Part 2). ✅ **Checkpoint:** you have an IP address.

---

## Part 2 — Create the VM

```bash
# [Cloud Shell]
gcloud compute instances create sabalist-search \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=30GB --boot-disk-type=pd-ssd \
  --address=sabalist-search-ip \
  --tags=typesense \
  --metadata=enable-oslogin=TRUE
```
What each line means:
- `e2-small` = 2 GB RAM, enough for ~1M search docs. (Bump to `e2-medium` later if needed.)
- `debian-12` = a lightweight, well-supported Linux.
- `30GB pd-ssd` = fast disk for the index + room to grow.
- `--address=sabalist-search-ip` = attach the static IP from Part 1.
- `--tags=typesense` = a label so firewall rules can target this VM.
- `enable-oslogin` = manage SSH access via your Google identity (more secure).

✅ **Checkpoint:** the command prints a table with `STATUS: RUNNING`.

---

## Part 3 — Firewall (network security)

By default the VM blocks incoming traffic. We open **only** what's needed:
- **80 + 443** (HTTP/HTTPS) — so the public + our website can reach search, and so Caddy
  can obtain a TLS certificate.
- **22 (SSH)** — but **only** through Google's secure IAP tunnel, **not** open to the world.

```bash
# [Cloud Shell]
# Public web traffic to the search server (only VMs tagged 'typesense')
gcloud compute firewall-rules create allow-search-web \
  --direction=INGRESS --action=ALLOW --rules=tcp:80,tcp:443 \
  --target-tags=typesense --source-ranges=0.0.0.0/0

# SSH ONLY from Google's IAP range (35.235.240.0/20) — no public port 22
gcloud compute firewall-rules create allow-iap-ssh \
  --direction=INGRESS --action=ALLOW --rules=tcp:22 \
  --target-tags=typesense --source-ranges=35.235.240.0/20
```

> **Why not open 22 to everyone?** Open SSH ports get brute-forced constantly. IAP means
> only *you*, authenticated through Google, can reach SSH. Note: **Typesense's own port
> 8108 is never opened** — it lives inside the VM's private Docker network, and only the
> Caddy HTTPS proxy can reach it. That's a key part of the security design.

✅ **Checkpoint:** both commands say `Creating firewall...done`.

---

## Part 4 — Point DNS at the server (do this BEFORE HTTPS)

Caddy gets a free TLS certificate by proving it controls `search.sabalist.com`, which
requires DNS to already point at your VM. So set this up now and let it propagate.

`sabalist.com` DNS is managed in **Vercel** (nameservers `ns1/ns2.vercel-dns.com`):
1. Go to <https://vercel.com> → your team → **Domains** → click **`sabalist.com`**.
2. Find **DNS Records** → **Add**.
3. Create an **A** record:
   - **Name/Host:** `search`
   - **Type:** `A`
   - **Value:** your `SEARCH_IP` from Part 1
   - **TTL:** 60 (or leave default)
4. Save.

> If your DNS is actually at a registrar (Hostinger, etc.) instead of Vercel, add the same
> **A record** `search` → `SEARCH_IP` there.

**Verify propagation** (wait 1–10 minutes, then in Cloud Shell):
```bash
# [Cloud Shell]
dig +short search.sabalist.com     # should print your SEARCH_IP
```
✅ **Checkpoint:** `dig` returns your `SEARCH_IP`. Don't continue to Part 6 until it does.

---

## Part 5 — Connect to the VM (SSH)

```bash
# [Cloud Shell]
gcloud compute ssh sabalist-search --zone=us-central1-a --tunnel-through-iap
```
- If prompted to create an SSH key, press **Enter** to accept defaults (leave passphrase
  empty is fine for now).
- First connect can take ~30 seconds.

✅ **Checkpoint:** your prompt changes to something like `yourname@sabalist-search:~$`.
**Every command below labelled `# [On the VM]` runs in this SSH session.**

---

## Part 6 — Install Docker

Docker runs Typesense and Caddy in isolated, easy-to-manage containers.

```bash
# [On the VM]
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
# Add Docker's official repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
# Let your user run docker without sudo
sudo usermod -aG docker $USER
```
Now **log out and back in** so the group change takes effect:
```bash
# [On the VM]
exit
```
```bash
# [Cloud Shell] — reconnect
gcloud compute ssh sabalist-search --zone=us-central1-a --tunnel-through-iap
```
```bash
# [On the VM] — verify
docker run --rm hello-world
```
✅ **Checkpoint:** you see "Hello from Docker!" (no `sudo` needed).

---

## Part 7 — Deploy Typesense + Caddy (with automatic HTTPS)

### 7.1 Generate a strong admin key and save it
```bash
# [On the VM]
mkdir -p ~/typesense && cd ~/typesense
ADMIN_KEY="$(openssl rand -hex 24)"
echo "$ADMIN_KEY" > ~/typesense/ADMIN_KEY.txt
chmod 600 ~/typesense/ADMIN_KEY.txt
echo "YOUR ADMIN KEY (save this): $ADMIN_KEY"
```
**Copy that key somewhere safe** (password manager). It's the master password for the
search engine. You'll send it to me at the end.

### 7.2 Create the compose file
```bash
# [On the VM]
cat > ~/typesense/docker-compose.yml <<EOF
services:
  typesense:
    image: typesense/typesense:27.1
    restart: unless-stopped
    command: '--data-dir /data --api-key=${ADMIN_KEY} --enable-cors'
    volumes:
      - ./data:/data
    # NOTE: no "ports:" here on purpose — Typesense is only reachable by Caddy,
    # never directly from the internet.
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    command: caddy reverse-proxy --from search.sabalist.com --to typesense:8108
    volumes:
      - ./caddy_data:/data
      - ./caddy_config:/config
EOF
```

### 7.3 Start it
```bash
# [On the VM]
cd ~/typesense
docker compose up -d
```
Caddy will now automatically fetch a TLS certificate for `search.sabalist.com` (this needs
Part 4's DNS to be live). Give it ~30–60 seconds, then check logs:
```bash
# [On the VM]
docker compose logs caddy | grep -i "certificate obtained" || docker compose logs --tail 20 caddy
docker compose ps
```
✅ **Checkpoint:** `docker compose ps` shows both `typesense` and `caddy` as **running/up**,
and the Caddy logs mention a certificate was obtained (or show no errors).

---

## Part 8 — Verify it works over HTTPS

```bash
# [On the VM]
# Public health check (no key needed) — should print {"ok":true}
curl -s https://search.sabalist.com/health
echo
# Authenticated check (needs the admin key) — should print [] (no collections yet)
curl -s https://search.sabalist.com/collections -H "X-TYPESENSE-API-KEY: $(cat ~/typesense/ADMIN_KEY.txt)"
echo
```
✅ **Checkpoint:** the first returns `{"ok":true}`, the second returns `[]`.
**Your search engine is live and secured with HTTPS.** 🎉

> You do **not** need to create the collection or load data yourself — I'll do that with the
> schema we already built once you send me the endpoint + key.

---

## Part 9 — Backups

Two layers. Layer A (disk snapshots) is the essential one; do it. Layer B is a bonus.

### 9.A Automated daily disk snapshots (do this — it backs up everything)
Run in **Cloud Shell** (not the VM):
```bash
# [Cloud Shell]
# A policy: snapshot daily at 03:00 UTC, keep 7 days, auto-delete old ones
gcloud compute resource-policies create snapshot-schedule sabalist-search-daily \
  --region=us-central1 \
  --max-retention-days=7 \
  --daily-schedule --start-time=03:00 \
  --on-source-disk-delete=keep-auto-snapshots

# Attach it to the VM's boot disk (the disk is named after the VM)
gcloud compute disks add-resource-policies sabalist-search \
  --resource-policies=sabalist-search-daily --zone=us-central1-a
```
✅ **Checkpoint:** both succeed. From now on you get automatic daily backups; to restore you'd
create a new disk from a snapshot (I can walk you through that if ever needed).

### 9.B (Optional) Typesense logical snapshot to Cloud Storage
A portable export of just the search data. Set up a bucket once:
```bash
# [Cloud Shell]
gcloud storage buckets create gs://sabalist-search-backups --location=us-central1 --uniform-bucket-level-access
```
Then on the VM you can trigger a Typesense snapshot + upload (run manually or via cron):
```bash
# [On the VM]
KEY=$(cat ~/typesense/ADMIN_KEY.txt)
curl -s -X POST "https://search.sabalist.com/operations/snapshot?snapshot_path=/data/snapshot" -H "X-TYPESENSE-API-KEY: $KEY"
sudo tar czf ~/typesense/snapshot.tgz -C ~/typesense/data snapshot
gcloud storage cp ~/typesense/snapshot.tgz gs://sabalist-search-backups/snapshot-$(date -u +%Y%m%d).tgz
```
(Skip 9.B for now if you want — 9.A already protects you. The index is also fully
rebuildable from Firestore, so search backups are a convenience, not a lifeline.)

---

## Part 10 — Monitoring & alerts

### 10.1 Install the Ops Agent (sends CPU/RAM/disk metrics to Google Cloud)
```bash
# [On the VM]
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```
✅ **Checkpoint:** finishes without error. Metrics now appear under **Monitoring** in the console.

### 10.2 Uptime check + email alert (so you're told if search goes down)
Easiest via the console:
1. Console (☰) → **Monitoring** → **Uptime checks** → **Create Uptime Check**.
2. Protocol **HTTPS**, Hostname `search.sabalist.com`, Path `/health`, check every 1 min → **Test** → **Create**.
3. When prompted, create an **Alert Policy** and add your email as a **Notification Channel**.
4. Also add a **Metric alert** for the VM: Monitoring → **Alerting** → **Create Policy** →
   metric `VM Instance → Memory utilization` > 85% (and one for `Disk utilization` > 85%) →
   notify your email.

✅ **Checkpoint:** you receive a test notification email; the uptime check shows green.

---

## Part 11 — Security hardening (final pass)

Most of this is already done by design; this is the checklist to confirm + a couple of adds.

- ✅ **SSH not public** — only via IAP (Part 3). Confirm no `default-allow-ssh` open rule:
  ```bash
  # [Cloud Shell]
  gcloud compute firewall-rules list --format='table(name,sourceRanges.list(),allowed[].map().firewall_rule().list())'
  ```
  If you see a rule allowing `tcp:22` from `0.0.0.0/0`, delete it:
  `gcloud compute firewall-rules delete default-allow-ssh` (only if present).
- ✅ **Typesense port 8108 is not exposed** — verify it's not published:
  ```bash
  # [On the VM]
  sudo ss -tlnp | grep -E ':8108|:443|:80'   # you should see 80/443 (docker-proxy), NOT 8108 on 0.0.0.0
  ```
- ✅ **Strong admin key** — 48 hex chars (Part 7).
- **Automatic security updates** — turn on unattended upgrades:
  ```bash
  # [On the VM]
  sudo apt-get install -y unattended-upgrades
  sudo dpkg-reconfigure -f noninteractive unattended-upgrades
  ```
- **Keep Typesense/Caddy updated** — every month or two:
  ```bash
  # [On the VM]
  cd ~/typesense && docker compose pull && docker compose up -d
  ```
- **The browser search key is scoped, not the admin key** — I'll generate a **search-only**
  key (can only run searches, cannot write/delete) for the website + app. The admin key
  never leaves the server and me.

---

## Part 12 — What to send me (then I take over)

Reply with:
1. **Endpoint:** `https://search.sabalist.com`
2. **Admin key:** the value from `~/typesense/ADMIN_KEY.txt`

I will then (no action needed from you):
- store the admin key as a secret and derive the **search-only** browser key,
- create the `listings` collection with the schema we already built + unit-tested,
- **bulk-load the current ~34k listings**,
- run the Phase 1 quality + parity checks (the stop-and-verify gate),
- refactor the website to read from search (with automatic Firestore fallback),
- set up the nightly reconciler.

---

## Part 13 — Troubleshooting

| Symptom | Fix |
|---|---|
| `dig` doesn't return your IP | DNS not propagated yet — wait 10–30 min; confirm the A record `search` → `SEARCH_IP` is saved. |
| Caddy logs show TLS/ACME errors | DNS must resolve to the VM **before** Caddy starts. Fix DNS, then `docker compose restart caddy`. |
| `curl https://search.sabalist.com/health` hangs | Firewall rule `allow-search-web` missing, or containers not up (`docker compose ps`). |
| `curl ...` returns cert error | Certificate not issued yet; wait 60s and retry; check `docker compose logs caddy`. |
| SSH won't connect | Ensure you used `--tunnel-through-iap` and the `allow-iap-ssh` rule exists. |
| Out of memory later (big index) | Resize VM: stop it, `gcloud compute instances set-machine-type sabalist-search --machine-type=e2-medium --zone=us-central1-a`, start it. |

---

## Part 14 — Cost & how to stop charges

| Item | ~Monthly |
|---|---|
| e2-small VM (always on) | ~$13 |
| 30 GB SSD | ~$5 |
| Static IP (in use) | ~$0 (free while attached) |
| Snapshots (7 daily, small) | ~$0.20–1 |
| **Total** | **~$18/mo** (less with a Committed-Use Discount later) |

- **Pause billing temporarily:** `gcloud compute instances stop sabalist-search --zone=us-central1-a`
  (you still pay for the disk + IP, ~$5/mo, but not compute). Start again with `... start ...`.
- **Delete everything** (if you ever abandon it):
  ```bash
  # [Cloud Shell]
  gcloud compute instances delete sabalist-search --zone=us-central1-a
  gcloud compute addresses delete sabalist-search-ip --region=us-central1
  gcloud compute firewall-rules delete allow-search-web allow-iap-ssh
  ```

---

### Quick command recap (once you're comfortable)
1. Reserve IP → 2. Create VM → 3. Firewall → 4. DNS A record → 5. SSH in →
6. Install Docker → 7. `docker compose up -d` → 8. verify `/health` →
9. snapshot policy → 10. Ops Agent + uptime alert → 11. hardening → 12. send me URL + key.
