# Deploy on Render

Graft CRM expects **PostgreSQL** and a **Node** runtime. This repo includes **`render.yaml`** so you can provision **Render Postgres + a Web Service** in one blueprint.

**Terminology**

| Environment | Database | Purpose |
|---------------|----------|---------|
| **Production (Render)** | Render Postgres from **`render.yaml`** | Live app your customers/teammates use on the public URL. |
| **Shared dev (optional)** | e.g. **Supabase** | One DB for the whole team while coding locally — see **[TEAM_DATABASE.md](./TEAM_DATABASE.md)**. Not the same as Render unless you intentionally point dev at prod (discouraged). |

---

## Who does what

### Repo owner (before / during deploy)

- Push the branch Render will build (usually **`main`**).
- Share **integration secrets** securely (1Password, etc.): Groq, Google OAuth, Resend, Wispr — variable names in **`README`** / [`src/lib/env.ts`](src/lib/env.ts). Never commit **`.env`** or paste secrets into GitHub issues.
- Decide **`AUTH_INVITE_ONLY`** for launch (open sign-up vs invite-only).
- After the teammate sends the **production URL**, add the Google **authorized redirect URI**:  
  `https://<your-render-host>/api/calendar/google/callback`  
  (must match **`AUTH_URL`**.)
- Keep **your** laptop on **`AUTH_URL=http://localhost:3000`** and a **local or Supabase** **`DATABASE_URL`** — production env vars live only on Render.

### Teammate running Render

Blueprint, Postgres, **`AUTH_SECRET`** / **`AUTH_URL`** / **`CRON_SECRET`**, paste shared integration keys, deploy, seed if agreed, configure cron.

---

## Teammate checklist — Render

Use this when someone else already pushed the app to GitHub and you own the live stack.

### Before you touch Render

- [ ] **Repo access** — clone/deploy rights on GitHub/GitLab.
- [ ] **Render access** — team/workspace with permission to create services.
- [ ] **Secrets ready** — generate (do not commit):
  - **`AUTH_SECRET`**: `openssl rand -base64 32`
  - **`CRON_SECRET`**: `openssl rand -hex 32`
- [ ] **Integration keys** — received securely from the repo owner (Groq, Google, Resend, etc.); paste into Render **after** deploy setup.

### First deploy

1. [ ] Render → **New → Blueprint** → repo + branch (**`main`**).
2. [ ] Confirm **`render.yaml`** resources: **`graft-postgres`** + **`graft-crm`** web service.
3. [ ] When prompted for **`sync: false`** vars, set **`AUTH_SECRET`**, **`AUTH_URL`**, **`CRON_SECRET`**:
   - **`AUTH_URL`** = public HTTPS URL (e.g. `https://graft-crm.onrender.com`), **no trailing slash**; update if you add a custom domain.
4. [ ] Wait for build + migrate + start to finish.
5. [ ] Smoke test: open the URL; **`/login`** should load. **`DATABASE_URL`** is **auto-injected** from Render Postgres — do not paste a duplicate unless you know you need an override.

### After first deploy

6. [ ] **Seed** (once per fresh production DB) — [§4 Seed production data](#4-seed-production-data-first-time).
7. [ ] **Cron** — `POST /api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>` — [§5 Daily digest cron](#5-daily-digest-cron).
8. [ ] **Optional env** — Calendar, AI, email, Wispr — names in **`README`** → Web Service → Environment → **Save** → redeploy.

### If something breaks

| Symptom | What to check |
|---------|----------------|
| Build fails | Deploy logs: `npm ci`, Prisma generate, `next build`. |
| Login / session weird | **`AUTH_URL`** matches the browser URL (HTTPS, no trailing **`/`**). **`AUTH_SECRET`** set; rotating it logs everyone out. |
| Migrate fails on start | Logs around `prisma migrate deploy`; fix migration/DB state before redeploying. |
| Email digests never send | **`RESEND_API_KEY`**, **`EMAIL_FROM`**; domain verified in Resend for production. |

More detail: [§8 Troubleshooting](#8-troubleshooting) (includes **local/Supabase** dev).

---

## Before you start

- Repo on **GitHub** or **GitLab**.
- **[Render](https://render.com)** account.
- Optional: edit **`render.yaml`** **`region`** / **`plan`** before blueprint apply.

---

## 1. Create the stack from the blueprint

1. Render → **New → Blueprint**.
2. Connect repo + branch.
3. Confirm **`render.yaml`** creates **`graft-postgres`** and **`graft-crm`**.
4. Confirm creation; first deploy runs automatically.

**`DATABASE_URL`** on the web service is wired from Render Postgres — no manual paste for the default setup.

---

## 2. Environment variables

Set **`sync: false`** secrets during blueprint setup or under **Web Service → Environment**.

### Required on Render

| Variable | How to set |
|----------|------------|
| **`AUTH_SECRET`** | `openssl rand -base64 32` |
| **`AUTH_URL`** | Public app URL, `https://…`, **no trailing slash** |
| **`CRON_SECRET`** | `openssl rand -hex 32` — protects **`POST /api/cron/reminders`** |

### Optional

Descriptions and full names: **`README`** (environment table) and **[`src/lib/env.ts`](src/lib/env.ts)**.

| Variable | Purpose |
|----------|---------|
| **`AUTH_INVITE_ONLY`** | `true` = no open sign-up; only existing **`User`** rows can sign in. |
| **`GROQ_*`** | AI + transcription |
| **`GOOGLE_*`** | Calendar OAuth (`GOOGLE_REDIRECT_URI` defaults to **`${AUTH_URL}/api/calendar/google/callback`** if unset) |
| **`RESEND_*`**, **`EMAIL_FROM`** | Outbound email; digests go to each **`User.email`** unless **`EMAIL_DIGEST_OUTBOUND_TO`** is set |
| **`EMAIL_DIGEST_OUTBOUND_TO`** | Optional — force **all** digests to one inbox (e.g. Resend test); omit for per-user recipients |
| **`WISPR_WEBHOOK_SECRET`** | Wispr webhook |
| **`PG_POOL_MAX`** | Cap `pg` pool size |

Redeploy after env changes.

**Sign-in:** Default = open sign-up (name + email + password, shared workspace). **`AUTH_INVITE_ONLY=true`** restricts to seeded/manual **`User`** rows. **Settings → Sign-in & team** lists users.

---

## 3. What happens on each deploy

| Phase | Command |
|-------|---------|
| **Build** | `npm ci && npx prisma generate && npm run build` |
| **Start** | `npx prisma migrate deploy && npm run start` |

Pending Prisma migrations apply to **Render Postgres**, then Next.js starts.

---

## 4. Seed production data (first time)

Seed does **not** run in **`startCommand`**. After first successful deploy:

**Option A — from your laptop**

```bash
export DATABASE_URL="postgresql://…"   # Render Postgres: Dashboard → **Connections** (internal or external URL per Render docs)
npm run db:seed
```

**Option B — Render Shell** (if available)

Set **`DATABASE_URL`** to the same Postgres URL, run **`npm run db:seed`**.

Behavior depends on **`AUTH_INVITE_ONLY`** and **`prisma/seed.ts`** / **`SEED_WORKSPACE_USERS`**.

---

## 5. Daily digest cron

Use Render Cron, GitHub Actions, or any scheduler:

```bash
curl -sS -X POST "https://YOUR_SERVICE.onrender.com/api/cron/reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use the **same** **`CRON_SECRET`** as in Render env.

---

## 6. Health checks & OAuth URLs

- **`healthCheckPath: /`** — Render health check hits **`/`** (anonymous behavior should still return a response).
- **Google Calendar:** Authorized redirect URI must include  
  `https://YOUR_AUTH_URL/api/calendar/google/callback`  
  exactly matching production **`AUTH_URL`**.

---

## 7. Adjusting `render.yaml`

- **`plan`**: confirm current Render pricing/free-tier limits.
- **`region`**: align web + Postgres.
- **Commands**: change **build**/**start** only if you have a deliberate reason.

---

## Local development

**Isolated DB per laptop**

```bash
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Default **`DATABASE_URL`** when unset matches **`docker-compose.yml`** — see **`README.md`**.

**Shared team DB (Supabase, etc.)**

See **[TEAM_DATABASE.md](./TEAM_DATABASE.md)** — everyone uses the **same** **`DATABASE_URL`** from the vault; each dev still uses **`AUTH_URL=http://localhost:3000`** and should generate **their own** **`AUTH_SECRET`** unless you standardize otherwise.

---

## 8. Troubleshooting

### Render production

- **`DATABASE_URL`**: normally injected; don’t delete the automatic mapping unless switching databases.
- **SSL**: Render-managed Postgres usually needs no extra TLS flags in the app.

### Local or Supabase (`npm run db:deploy`, `db:seed`, `npm run dev`)

| Issue | What to try |
|-------|-------------|
| **`P1001`** Can’t reach **`db.*.supabase.co:5432`** | Supabase **direct** connections are often **IPv6-only**. Use **Session pooler** URI from **Connect** (IPv4-friendly). See **[TEAM_DATABASE.md](./TEAM_DATABASE.md)**. |
| **`P1011`** / **self-signed certificate** / TLS | Append **`uselibpqcompat=true`** to **`DATABASE_URL`** (with **`sslmode=require`**). Dev-only escape hatch: **`DATABASE_SSL_REJECT_UNAUTHORIZED=false`** — see **`TEAM_DATABASE.md`**. **Do not** enable that on production Render unless you fully understand the risk. |
| **`relation does not exist`** | Run **`npm run db:deploy`** against the same **`DATABASE_URL`** you use for the app. |

### Repo owner vs Render ops

- **You don’t need a Render login** to write code; you **do** need one (or a teammate) to operate production.
- **No repo change** is required “because Render” beyond **`render.yaml`** and docs — secrets stay in the dashboard.

---

## Other hosts

Same idea: set **`DATABASE_URL`**, run **`npm run db:deploy`** before **`npm run start`**. **`npm run vercel-build`** exists for Vercel-style pipelines if you adopt that.
