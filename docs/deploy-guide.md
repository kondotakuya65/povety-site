# Prosperax deploy guide (Phase 8)

Step-by-step guide to run **prosperax.org** on a Linux VPS with **Nginx + PM2 + PostgreSQL**.

Target stack:

| Piece | Role |
|---|---|
| GoDaddy domain | DNS for `prosperax.org` |
| Linux VPS (Ubuntu 22.04/24.04 recommended) | App host |
| Nginx | HTTPS reverse proxy |
| PM2 | Keep frontend + backend running |
| PostgreSQL | Database |
| Let’s Encrypt (certbot) | TLS certificates |

App layout on the server:

```text
/var/www/prosperax/
  apps/frontend/     # Next.js (:3000)
  apps/backend/      # FastAPI/uvicorn (:8000)
  apps/backend/uploads/
```

---

## 0. Before you start

Have ready:

1. VPS SSH access (root or sudo user)
2. Domain `prosperax.org` on GoDaddy
3. Git repo URL (GitHub/GitLab)
4. Production secrets:
   - strong `JWT_SECRET`
   - Paystack **test** keys first (live keys in Phase 9)
   - Termii API key (when SMS goes live)
   - SMTP credentials (when email goes live; console is OK initially)
5. Admin phone numbers for `ADMIN_PHONE` / `ADMIN_PHONES`

Suggested VPS size to start: **1–2 vCPU, 2 GB RAM, 40 GB disk**.

---

## 1. Point DNS (GoDaddy)

In GoDaddy DNS for `prosperax.org`:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | your VPS public IP | 600 (or default) |
| A | `www` | your VPS public IP | 600 |

Optional later: redirect `www` → apex in Nginx.

Wait until DNS resolves:

```bash
dig +short prosperax.org
ping prosperax.org
```

---

## 2. Prepare the VPS

SSH in:

```bash
ssh root@YOUR_VPS_IP
# or: ssh ubuntu@YOUR_VPS_IP
```

Update packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx certbot python3-certbot-nginx ufw
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### PM2

```bash
sudo npm install -g pm2
```

### Python 3 + venv

```bash
sudo apt install -y python3 python3-venv python3-pip
python3 --version
```

### PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Create DB + user (choose a strong password):

```bash
sudo -u postgres psql <<'SQL'
CREATE USER prosperax WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE prosperax OWNER prosperax;
GRANT ALL PRIVILEGES ON DATABASE prosperax TO prosperax;
SQL
```

On newer Postgres you may also need:

```bash
sudo -u postgres psql -d prosperax -c "GRANT ALL ON SCHEMA public TO prosperax;"
```

---

## 3. Clone the repo

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone YOUR_REPO_URL prosperax
cd prosperax
```

Create uploads dir:

```bash
mkdir -p /var/www/prosperax/apps/backend/uploads
chmod 755 /var/www/prosperax/apps/backend/uploads
```

---

## 4. Backend production env

```bash
cd /var/www/prosperax/apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
nano .env
```

### Recommended production `.env`

```env
ENVIRONMENT=production
CORS_ORIGINS=https://prosperax.org,https://www.prosperax.org
DATABASE_URL=postgresql+psycopg://prosperax:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/prosperax
UPLOAD_DIR=/var/www/prosperax/apps/backend/uploads

ADMIN_PHONE=+2348XXXXXXXXX
ADMIN_PHONES=
ADMIN_EMAIL=admin@prosperax.org

JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
JWT_EXPIRE_MINUTES=10080

# SMS: console until Termii is ready, then termii
SMS_PROVIDER=console
TERMII_API_KEY=
TERMII_SENDER_ID=Prosperax

# Email: console until SMTP is ready, then smtp
MAIL_PROVIDER=console
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_USE_TLS=true
SMTP_USE_SSL=false
MAIL_FROM=Prosperax <noreply@prosperax.org>
MAIL_REPLY_TO=support@prosperax.org

# Paystack: keep mock/test first
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_MOCK=false

FRONTEND_URL=https://prosperax.org
```

Generate a JWT secret:

```bash
openssl rand -hex 32
```

### Migrate + seed

```bash
cd /var/www/prosperax/apps/backend
source .venv/bin/activate
alembic upgrade head
python -m app.scripts.seed
```

Quick API check (without Nginx yet):

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
# in another SSH session:
curl http://127.0.0.1:8000/api/health
# Ctrl+C when done
```

---

## 5. Frontend production build

```bash
cd /var/www/prosperax/apps/frontend
npm ci
```

Create `/var/www/prosperax/apps/frontend/.env.production` (or `.env.local` used at build/start):

```env
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SITE_URL=https://prosperax.org
```

Build:

```bash
npm run build
```

Notes:

- Browser calls go to `https://prosperax.org/api/...` and `/media/...`
- Nginx can proxy those directly to the backend (recommended), **or** Next rewrites can forward to `BACKEND_URL`
- This guide uses **Nginx for `/api` and `/media`** so Paystack webhooks hit FastAPI reliably

---

## 6. PM2 process file

Create `/var/www/prosperax/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "prosperax-backend",
      cwd: "/var/www/prosperax/apps/backend",
      script: ".venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      env: {
        ENVIRONMENT: "production",
      },
    },
    {
      name: "prosperax-frontend",
      cwd: "/var/www/prosperax/apps/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        BACKEND_URL: "http://127.0.0.1:8000",
        NEXT_PUBLIC_SITE_URL: "https://prosperax.org",
      },
    },
  ],
};
```

Start + persist:

```bash
cd /var/www/prosperax
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs
pm2 startup
# run the command PM2 prints, then:
pm2 save
```

Checks:

```bash
curl http://127.0.0.1:8000/api/health
curl -I http://127.0.0.1:3000
```

---

## 7. Nginx reverse proxy

Create `/etc/nginx/sites-available/prosperax`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name prosperax.org www.prosperax.org;

    client_max_body_size 12m;

    # API → FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded photos → FastAPI static mount
    location /media/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # App → Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/prosperax /etc/nginx/sites-enabled/prosperax
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://prosperax.org` (HTTP first).

---

## 8. HTTPS with Let’s Encrypt

```bash
sudo certbot --nginx -d prosperax.org -d www.prosperax.org
```

Follow prompts (email + agree to terms). Certbot will adjust Nginx for TLS and renewals.

Confirm:

```bash
sudo systemctl status certbot.timer
curl -I https://prosperax.org
curl https://prosperax.org/api/health
```

---

## 9. Cron jobs (payouts + refunds)

Use the backend CLI (no auth tokens needed on the server):

```bash
crontab -e
```

Add:

```cron
# Weekly payouts — Mondays 09:00 Lagos (WAT = UTC+1)
0 8 * * 1 cd /var/www/prosperax/apps/backend && .venv/bin/python -m app.scripts.money_jobs payouts >> /var/log/prosperax-payouts.log 2>&1

# Daily unmet-goal / deadline refund sweep — 02:00 Lagos
0 1 * * * cd /var/www/prosperax/apps/backend && .venv/bin/python -m app.scripts.money_jobs refunds >> /var/log/prosperax-refunds.log 2>&1
```

Create log files once:

```bash
sudo touch /var/log/prosperax-payouts.log /var/log/prosperax-refunds.log
sudo chown $USER:$USER /var/log/prosperax-payouts.log /var/log/prosperax-refunds.log
```

Manual test:

```bash
cd /var/www/prosperax/apps/backend
source .venv/bin/activate
python -m app.scripts.money_jobs payouts
python -m app.scripts.money_jobs refunds
```

Admin UI can still trigger the same actions at `/admin/money`.

---

## 10. Paystack webhook

In Paystack Dashboard → Settings → API Keys & Webhooks:

**Webhook URL**

```text
https://prosperax.org/api/webhooks/paystack
```

Events needed (at minimum):

- `charge.success`
- `transfer.success` / `transfer.failed` (as available)
- `refund.processed` / refund failure events (as available)

Confirm the backend can receive POSTs publicly (no basic auth on `/api/webhooks/`).

Keep `PAYSTACK_MOCK=false` and use **test keys** until Phase 9 go-live.

---

## 11. First smoke test on production

1. Open `https://prosperax.org`
2. Log in with admin phone (`ADMIN_PHONE`) — OTP via console/Termii
3. Open `/admin` → Overview loads
4. Create a help request → approve in Admin → Requests
5. Donate with Paystack **test** mode
6. Confirm donation appears in Admin → Donations (`held`)
7. Confirm webhook deliveries in Paystack dashboard
8. Optional: run payout/refund CLI in test mode

---

## 12. Deploy update runbook

After code changes:

```bash
cd /var/www/prosperax
git pull

# Backend deps + migrations
cd apps/backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# Frontend build
cd ../frontend
npm ci
npm run build

# Restart processes
cd /var/www/prosperax
pm2 restart prosperax-backend prosperax-frontend
pm2 status
pm2 logs --lines 80
```

Health checks:

```bash
curl -fsS https://prosperax.org/api/health
curl -I https://prosperax.org
```

---

## 13. Backups (do early)

### Postgres daily dump

```bash
mkdir -p /var/backups/prosperax
crontab -e
```

```cron
30 2 * * * pg_dump -U prosperax -h 127.0.0.1 prosperax | gzip > /var/backups/prosperax/db-$(date +\%F).sql.gz
```

You may need a `~/.pgpass` file so cron can authenticate non-interactively.

### Uploads

```bash
# simple daily copy (replace with rsync/offsite later)
15 3 * * * tar -czf /var/backups/prosperax/uploads-$(date +\%F).tar.gz -C /var/www/prosperax/apps/backend uploads
```

Keep at least 7–14 days of backups.

---

## 14. GoDaddy-specific notes

- **DNS only** is required from GoDaddy for this setup (A records). Hosting can stay on your VPS.
- Use GoDaddy **email mailbox** for human support (`support@…`) if you want; app mail should still use transactional SMTP later (Brevo/SendGrid/SES), not mailbox SMTP if deliverability matters.
- If GoDaddy offers a VPS, Ubuntu + SSH is fine — follow this same guide.
- Open ports **22 / 80 / 443** only. Do **not** expose Postgres (`5432`) or app ports (`3000`/`8000`) publicly.

---

## 15. Troubleshooting

| Symptom | Check |
|---|---|
| 502 Bad Gateway | `pm2 status`, `pm2 logs`, `sudo nginx -t` |
| `/api/health` fails | backend `.env`, DB URL, `pm2 restart prosperax-backend` |
| Photos 404 | `UPLOAD_DIR` path + permissions; Nginx `/media/` block |
| OTP never arrives | `SMS_PROVIDER`, Termii key/sender; check backend logs |
| Emails missing | `MAIL_PROVIDER`; console logs on VPS until SMTP is set |
| Paystack webhook failures | public HTTPS URL, signature secret key, Nginx `/api/` proxy |
| Admin forbidden | phone normalized and listed in `ADMIN_PHONE(S)` |
| After deploy old UI | hard refresh; confirm `npm run build` + frontend PM2 restart |

Useful commands:

```bash
pm2 status
pm2 logs prosperax-backend --lines 100
pm2 logs prosperax-frontend --lines 100
sudo journalctl -u nginx -n 100 --no-pager
sudo tail -f /var/log/nginx/error.log
```

---

## 16. Security checklist

- [ ] Strong DB password and `JWT_SECRET`
- [ ] `.env` not committed to git
- [ ] UFW enabled (SSH + HTTP/HTTPS only)
- [ ] App binds to `127.0.0.1` (not `0.0.0.0`) behind Nginx
- [ ] HTTPS working with auto-renew
- [ ] Paystack still on **test** keys until Phase 9
- [ ] Admin phone(s) verified
- [ ] Backups scheduled

---

## Related docs

- Product + architecture: `docs/project-plan.md`
- Phase checklist: `docs/implementation-steps.md` (Phase 8 / Phase 9)
- Local setup: root `README.md`

When this guide is complete and smoke tests pass, continue with **Phase 9 — Go-live checklist**.
