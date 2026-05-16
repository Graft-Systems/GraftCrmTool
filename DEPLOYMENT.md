# Deploy on Render

Graft CRM expects **PostgreSQL** and a **Node** runtime. This repo includes **`render.yaml`** so you can provision **Render Postgres + a Web Service** in one blueprint.

---

## Teammate checklist — what you should do on Render

Use this if someone else already pushed the app to GitHub and you are deploying or joining the live stack.

### Before you touch Render

- [ ] **Repo access** — clone rights (or deploy via org repo) on GitHub/GitLab.
- [ ] **Render access** — invited to the Render **team** or **workspace** that owns the service (or use your own Render account for a trial deploy).
- [ ] **Secrets ready** — generate locally (do not commit these):
  - `AUTH_SECRET`: `openssl rand -base64 32`
  - `CRON_SECRET`: `openssl rand -hex 32`

### Deploy (first time or new environment)

1. [ ] **New → Blueprint** in Render; connect the repo and branch (usually `main`).
2. [ ] Confirm Resources from **`render.yaml`**: **`graft-postgres`** + **`graft-crm`** web service.
3. [ ] When prompted for **sync secrets**, paste **`AUTH_SECRET`**, **`AUTH_URL`**, and **`CRON_SECRET`**:
   - **`AUTH_URL`** = the **public** HTTPS URL Render will assign (e.g. `https://graft-crm.onrender.com`), **no trailing slash**. If you add a custom domain later, update **`AUTH_URL`** to match.
4. [ ] Wait for the **first deploy** to finish (build + migrate + start).
5. [ ] **Smoke test** — open the service URL; login page should load. **`DATABASE_URL`** is auto-injected from Postgres — you should not set it manually on the web service.

### After first deploy

6. [ ] **Seed the database** (once per fresh Postgres) — see [§4 Seed production data](#4-seed-production-data-first-time). Without seed, you may have no workspace/demo data; users can still **sign up with email + password + full name** unless **`AUTH_INVITE_ONLY=true`** (then only existing **`User`** rows can sign in).
7. [ ] **Cron** — configure something to **POST** `/api/cron/reminders` with header `Authorization: Bearer <CRON_SECRET>` on your schedule — see [§5 Daily digest cron](#5-daily-digest-cron).
8. [ ] **Optional integrations** — if the team uses Calendar AI or email digests, add keys from **`.env.example`** in **Web Service → Environment** and redeploy.

### If something breaks

- Build failures: check **Deploy logs** for Prisma / `npm ci` errors.
- Login failures: confirm **`AUTH_URL`** matches the URL users open (scheme + host, no trailing slash); confirm **`AUTH_SECRET`** is set and did not change mid-session without clearing cookies.
- Migrations: **`startCommand`** runs `prisma migrate deploy`; if migrate fails, fix migration state before redeploying.

Details for each step are below.

---

## Before you start

- Push the repo to **GitHub** or **GitLab** (Render pulls from git).
- Have a **[Render](https://render.com)** account.
- Optional: pick a **region** in `render.yaml` (`oregon` today); change `region` / `plan` if your team prefers another region or tier.

---

## 1. Create the stack from the blueprint

1. In Render: **New → Blueprint**.
2. Connect the repo and select the branch (usually `main`).
3. Review the resources Render will create from **`render.yaml`**:
   - **`graft-postgres`** — managed PostgreSQL (`graft_crm` database, user `graft`).
   - **`graft-crm`** — Web service running **Next.js**.
4. Confirm creation. Render will run the first deploy automatically.

`DATABASE_URL` is **injected** into the web service from the database — you do not paste it manually.

---

## 2. Set environment variables (secrets)

In the **Web Service** → **Environment**, add values for every key marked `sync: false` in `render.yaml`. Render prompts for these during blueprint setup or you can add them afterward.

| Variable | Required | How to set |
|----------|----------|------------|
| **`AUTH_SECRET`** | Yes | `openssl rand -base64 32` |
| **`AUTH_URL`** | Yes | Your **public** app URL, e.g. `https://graft-crm.onrender.com` — **no trailing slash**. Update this if you attach a custom domain. |
| **`CRON_SECRET`** | Yes in production | `openssl rand -hex 32` — used to authenticate calls to `/api/cron/reminders`. |

Optional (see **`.env.example`** for descriptions):

| Variable | Purpose |
|----------|---------|
| **`AUTH_INVITE_ONLY`** | Set to `true` to **disable** open sign-up; only emails that already have a **`User`** row can sign in. |
| **`GROQ_*`** | AI summaries + transcription |
| **`GOOGLE_*`** | Calendar OAuth + meeting scheduling |
| **`RESEND_*` / `EMAIL_*`** | Email reminders / digests |
| **`WISPR_WEBHOOK_SECRET`** | Wispr ingest webhook |
| **`PG_POOL_MAX`** | Postgres pool sizing |

Redeploy the web service after changing env vars.

**Who can sign in:** By default, **first visit** users can create an account with **email + password + full name** (shared workspace data). Set **`AUTH_INVITE_ONLY=true`** to restrict to existing **`User`** rows only (seed or manual inserts). Use **Settings → Sign-in & team** in the app to inspect workspace users.

---

## 3. What happens on each deploy

| Phase | Command |
|-------|---------|
| **Build** | `npm ci && npx prisma generate && npm run build` |
| **Start** | `npx prisma migrate deploy && npm run start` |

Every new release applies **pending Prisma migrations** against Render Postgres, then starts **Next.js** on the port Render provides.

---

## 4. Seed production data (first time)

The seed script is **not** run automatically. After the first successful deploy:

**Option A — from your laptop** (simplest):

```bash
export DATABASE_URL="postgresql://…"   # Internal DB URL from Render Postgres dashboard (Settings → Connections)
npm run db:seed
```

Use the **internal** or **external** connection string Render shows for Postgres (external requires allowed IPs / SSL per Render docs).

**Option B — Render Shell** (if enabled on your plan):

Open **Web Service → Shell**, install deps if needed, set `DATABASE_URL`, run `npm run db:seed`.

Sign-in behavior depends on **`AUTH_INVITE_ONLY`** and seeded users — see **`prisma/seed.ts`** and **`SEED_WORKSPACE_USERS`**.

---

## 5. Daily digest cron

Render’s managed cron product can call your app, or use **GitHub Actions** with secrets.

**Recommended pattern** — scheduled workflow calling your live URL:

```bash
curl -sS -X POST "https://YOUR_SERVICE.onrender.com/api/cron/reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use the **same** `CRON_SECRET` value as in Render env vars.

---

## 6. Health checks & URLs

- **`healthCheckPath: /`** — Render pings `/`; ensure the home route responds (this app redirects `/` → `/inbox` for signed-in users — verify behavior for anonymous requests).
- **Google OAuth**: authorized redirect URI must include  
  `https://YOUR_AUTH_URL/api/calendar/google/callback`  
  (match **`AUTH_URL`** exactly).

---

## 7. Adjusting `render.yaml`

- **`plan`**: `starter` is a paid tier on Render; switch to a **free** web tier in the dashboard if needed (blueprint may need editing — confirm current Render free-tier limits).
- **`region`**: align Postgres and Web Service for latency.
- **Build/start**: change only if you know you need a different install or migrate strategy.

---

## Local development (same Postgres shape)

```bash
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

See **`README.md`** for variable details.

---

## Other hosts

You can run the same Docker/Postgres app on any Node host by setting **`DATABASE_URL`** and running **`npm run db:deploy`** before **`npm run start`**. Vercel + Neon is possible but not documented here; use **`npm run vercel-build`** if you adopt that stack.
