# Graft CRM

Company-first CRM for **Graft Systems**: companies, follow-ups, meetings, competitions, investors, capital runway, voice capture (Wispr), and email digests.

Built with **Next.js** (App Router), **React 19**, **Prisma** (**PostgreSQL**), and **NextAuth** (credentials).

## Prerequisites

- **Node.js** 20+
- **Docker** (recommended for local Postgres) — or any PostgreSQL 16+ instance
- **npm**

## Quick start (local)

```bash
git clone <repository-url>
cd graft-crm-tool
npm install
docker compose up -d
cp .env.example .env
```

Edit `.env`: set `AUTH_SECRET`, `AUTH_URL`, and optional integrations. Anyone who has a **`User`** row in Postgres can sign in (no separate email allowlist env var).  
If `DATABASE_URL` is omitted, it defaults to:

`postgresql://graft:graft@localhost:5432/graft_crm`

(match `docker-compose.yml`).

Then:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sign-in (after seed)

Auth uses **email and password** (minimum length in code — see `src/lib/auth/password.ts`). Open sign-up creates a workspace member unless **`AUTH_INVITE_ONLY=true`**. **Everyone picks their own password** the first time they sign in (including seeded emails — no shared demo password).

Seeded workspace accounts (see `SEED_WORKSPACE_USERS` in [`src/lib/constants.ts`](src/lib/constants.ts)):

- `owner@graft.systems` (admin)
- `teammate@graft.systems`
- `arnavsai410@gmail.com`

Add teammates via **open sign-up** on `/login` (name + email + password), or extend **`SEED_WORKSPACE_USERS`** and **`npm run db:seed`**, or insert **`User`** rows. **Settings → Sign-in & team** lists workspace users and last sign-in.

If login fails, confirm **`npm run db:migrate`** has been applied and Postgres is reachable; for seeded emails, use **first sign-in** to create your password (or check **`AUTH_INVITE_ONLY`** if sign-up is disabled).

---

## Hosting (production)

Deploy on **Render** using the included **`render.yaml`** blueprint (Postgres + Web Service). Full steps: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

- **`AUTH_URL`** must be your public HTTPS URL (needed for NextAuth and Google Calendar OAuth).
- **`CRON_SECRET`** + an external scheduler hit **`POST /api/cron/reminders`** for daily digests (see DEPLOYMENT.md).

---

## Environment variables

Copy `.env.example` → `.env`. Parsing lives in [`src/lib/env.ts`](src/lib/env.ts).

### Core

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL URL (local default above if unset) |
| `AUTH_SECRET` | NextAuth — `openssl rand -base64 32` |
| `AUTH_URL` | App origin, e.g. `http://localhost:3000` (no trailing slash) |

### Optional

| Variable | Purpose |
|----------|---------|
| `PG_POOL_MAX` | Cap `pg` pool size (default 5 prod / 10 dev) |
| `GROQ_*` | AI + transcription |
| `GOOGLE_*` | Calendar OAuth |
| `RESEND_*`, `EMAIL_DIGEST_OUTBOUND_TO` | Email digests |
| `CRON_SECRET` | Secures `/api/cron/reminders` |
| `WISPR_WEBHOOK_SECRET` | Wispr webhook |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm run vercel-build` | `generate` + **`migrate deploy`** + `next build` (Vercel-style) |
| `npm run start` | Production server (run **`db:deploy`** first if DB is new) |
| `npm run db:migrate` | Create/apply migrations in dev |
| `npm run db:deploy` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Seed sample workspace |
| `npm run lint` | ESLint |

---

## Email digests

Digests list **your** open follow-ups (overdue / today / this week) and **meetings today** from Google Calendar when connected.

- **Settings**: test digest, run workspace digest, recent outbox.
- **Automated daily**: external cron → `POST /api/cron/reminders` with `CRON_SECRET` (see DEPLOYMENT.md).

Without Resend, sends may stay **outbox-only**.

---

## Layout

| Path | Role |
|------|------|
| `src/app/` | Routes & API |
| `src/server/actions/` | Server actions |
| `src/lib/` | Env, DB, auth, domains |
| `prisma/` | Schema, migrations, seed |
| `docker-compose.yml` | Local Postgres |
| `render.yaml` | Render blueprint |
| `DEPLOYMENT.md` | Production checklist |

---

## License

Private / internal unless noted otherwise.
