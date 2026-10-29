# Deploying Pantry for Free

Every service used here has a permanent free tier — **no credit card required**.

---

## Free Stack

| Layer | Service | Free Tier |
|---|---|---|
| **Database** | [Supabase](https://supabase.com) | 500 MB PostgreSQL, always free |
| **Backend** | [Render](https://render.com) | 750 hrs/month web service |
| **Frontend** | [Vercel](https://vercel.com) | Unlimited static deploys |
| **Email** | [Resend](https://resend.com) | 3 000 emails/month |
| **Images** | [Cloudinary](https://cloudinary.com) | 25 GB storage + 25 GB bandwidth |

---

## Step 1 — Database (Supabase, 5 min)

1. Sign up at [supabase.com](https://supabase.com)
2. **New project** → give it a name + password
3. Go to **Settings → Database → Connection string** → copy the URI
4. Use it as `DATABASE_URL` in your environment

---

## Step 2 — Email (Resend, 2 min)

1. Sign up at [resend.com](https://resend.com)
2. **API Keys → Create API Key**
3. Set `RESEND_API_KEY=re_xxxx` in your environment
4. Optional: verify your domain to send from your own address

---

## Step 3 — Images (Cloudinary, 2 min)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. **Dashboard → copy Cloud Name, API Key, API Secret**
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
4. Without these, images save to local `/uploads` (fine for dev, not for production)

---

## Step 4 — Deploy backend to Render

```bash
# Option A: Blueprint (recommended)
# → dashboard.render.com → New → Blueprint → connect GitHub → pick render.yaml

# Option B: Manual
# → New Web Service → connect repo → set environment variables → Deploy
```

Required env vars on Render:
```
DATABASE_URL       # from Supabase
SECRET_KEY         # python -c "import secrets; print(secrets.token_hex(32))"
APP_ENV            production
APP_CORS_ORIGINS   https://your-vercel-app.vercel.app
RESEND_API_KEY     re_xxxx
EMAIL_FROM         Pantry <onboarding@resend.dev>
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

---

## Step 5 — Deploy frontend to Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
# Answer the prompts; set VITE_API_URL=https://pantry-api.onrender.com/api/v1
```

Or connect the GitHub repo at [vercel.com](https://vercel.com) → Import → set env var.

---

## Step 6 — Seed demo data

```bash
# SSH into your Render service or run locally with production DATABASE_URL
cd backend
python -m scripts.seed
# Creates: admin@pantry.dev / admin1234 + 20 products + 3 coupons + 28 slots
```

---

## Cost breakdown

| Service | Free limit | Pantry usage |
|---|---|---|
| Supabase | 500 MB DB | ~50 MB for a typical store |
| Render | 750 hrs/month (sleeps after 15 min idle) | 1 service |
| Vercel | 100 GB bandwidth/month | Static files |
| Resend | 3 000 emails/month | Confirmation + status emails |
| Cloudinary | 25 GB storage | Product images |

**Total cost: $0/month** until you scale beyond these limits.

---

## Waking up a sleeping Render service

Render's free tier spins down after 15 minutes of inactivity. The first request
takes ~30 seconds to wake up. To avoid this:

- Add an uptime monitor (e.g. [UptimeRobot](https://uptimerobot.com) — free)
  pinging `/health` every 5 minutes.
- Or upgrade to Render Starter ($7/month) to disable sleep.
