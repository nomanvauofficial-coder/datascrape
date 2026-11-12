# ScrapeFlow 🚀

A dynamic web-scraping SaaS: paste any category page or URL, extract structured data
(products, links, images, tables, text), and export it as CSV/JSON. Includes a 1-day
free trial and Weekly / Monthly / Lifetime subscription tiers (simulated checkout).

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-darkgreen) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- **Universal scraper engine** — 6 extract modes: `auto`, `products`, `links`, `images`, `tables`, `text`
- **Rich field extraction** — id, name, title, price, image, URL, rating, availability and more, collected from tags *and* `data-*` attributes
- **Per-plan limits** — trial: 20 items/scrape · Weekly: 50 · Monthly: 100 · Lifetime: 200 (engine hard cap 500)
- **1-day free trial** with daily usage caps, then simulated card checkout (test card `4242 4242 4242 4242`)
- **Scrape history** persisted per user, with CSV / JSON export
- Auth (scrypt-hashed passwords + bearer sessions), dark emerald UI (shadcn/ui), fully responsive

## Tech stack

Next.js 16 (App Router) · TypeScript · Supabase (Auth + Postgres) · cheerio · Tailwind CSS 4 · shadcn/ui

## Run locally

```
npm install
cp .env.example .env.local   # then fill SUPABASE_SERVICE_ROLE_KEY
npm run dev                  # http://localhost:3000
```

Auth and data live in **Supabase** (tables `profiles` and `scrapes`, with Row Level Security).
Users sign up / log in with Supabase Auth; a database trigger creates their 1-day trial profile.

## Push this project to GitHub

```bash
cd <your-project-folder>
git init                      # skip if already a git repo
git add .
git commit -m "ScrapeFlow initial commit"
git branch -M main

# create the repo on GitHub (pick ONE of the two options)

# Option A — GitHub CLI:
gh repo create scrapeflow --public --source=. --push

# Option B — manual:
#   1. Create an empty repo at https://github.com/new (do NOT add a README/license)
#   2. Then:
git remote add origin https://github.com/<YOUR-USERNAME>/scrapeflow.git
git push -u origin main
```

> **Never commit `.env` or `db/custom.db`** — both are already in `.gitignore`.

## Deploy

### ✅ Recommended: Vercel / Railway / Render / Fly.io

This is a **full-stack Next.js app** (API routes + database). It needs a Node server,
so it **cannot run on GitHub Pages** (static hosting only) — GitHub Actions CI in this
repo will build & verify it, but hosting must be one of the platforms below:

| Platform | How | Notes |
|---|---|---|
| **Vercel** (easiest) | Import the GitHub repo at vercel.com → auto-detects Next.js | SQLite is ephemeral on serverless — fine for demos, not for production data |
| **Railway / Render** | Connect repo → build `npm install && npm run build` → start `npm start` | Add a **persistent volume** mounted at `/app/db` to keep SQLite data |
| **Fly.io / Docker** | `docker build .` with a standalone Next.js container | Mount a volume for `/app/db` |

**Build settings (non-Vercel platforms):**

- Install command: `npm install` (postinstall auto-runs `prisma generate`)
- Build command: `npm run build`
- Start command: `npm start` (runs `node .next/standalone/server.js`)
- Env var: `DATABASE_URL=file:../db/custom.db`
- Node version: **>= 20.9**

### Production database (recommended for real users)

SQLite lives on a single disk. For multi-instance serverless hosting, switch Prisma to
a hosted database — change one line in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"          // was "sqlite"
  url      = env("DATABASE_URL")   // e.g. Neon / Supabase connection string
}
```

Then run `npm run db:push` against the new database. No application code changes needed.

## Pricing tiers

| Plan | Price | Items / scrape | Scrapes / day |
|---|---|---|---|
| Free trial | 1 day free | 20 | 10 |
| Weekly | $4.99 / wk | 50 | 100 |
| Monthly | $14.99 / mo | 100 | 500 |
| Lifetime | $79 once | 200 | Unlimited |

> Checkout is simulated for demo purposes — use test card `4242 4242 4242 4242`, any future expiry, any CVC.

## Project structure

```
src/
  app/
    api/
      auth/          # signup / login / me
      billing/       # subscribe (simulated payment gateway)
      scrape/        # scrape execution + limits
      scrapes/       # history detail
    page.tsx         # landing page
  components/scrapeflow/   # landing, auth modal, dashboard, results table, checkout
  lib/
    scraper.ts       # extraction engine (cheerio, 6 modes, SSRF guard)
    plans.ts         # plan definitions + access computation
    auth.ts          # password hashing + sessions
    types.ts         # shared types + CSV/JSON export helpers
prisma/schema.prisma # User, Session, Scrape models
```
