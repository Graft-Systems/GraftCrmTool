# Graft CRM

Company-first CRM for **Graft Systems**: companies, follow-ups, meetings, competitions, investors, capital runway, voice capture (Wispr), and email digests.

Built with **Next.js** (App Router), **React 19**, **Prisma** (**PostgreSQL**), and **NextAuth** (credentials).

## Prerequisites

- **Node.js** 20+
- **Docker** (optional — local Postgres only) or access to **hosted** Postgres (e.g. Supabase)
- **npm**

---

## Quick start

```bash
git clone <repository-url>
cd graft-crm-tool
npm install
cp .env.example .env
```

Edit **`.env`** at minimum:

| Variable | Local dev |
|----------|-----------|
| **`AUTH_SECRET`** | `openssl rand -base64 32` — each developer should use **their own** value. |
| **`AUTH_URL`** | `http://localhost:3000` (no trailing slash) |
| **`DATABASE_URL`** | See **two paths** below |

Then install schema + seed and run the app (exact commands depend on which DB path you use).

Open [http://localhost:3000](http://localhost:3000).

### Path A — Postgres on your laptop (Docker)

**Your own data only** — not shared with teammates.

```bash
docker compose up -d
```

If **`DATABASE_URL`** is unset, it defaults to:

`postgresql://graft:graft@localhost:5432/graft_crm`

(match **`docker-compose.yml`**).

```bash
npm run db:migrate
npm run db:seed    # optional
npm run dev
```

### Path B — Shared team database (Supabase)

**Same data for everyone** — see **[TEAM_DATABASE.md](./TEAM_DATABASE.md)** for creating the project, **Session pooler** URI (IPv4), and TLS notes (`uselibpqcompat=true`, dev-only **`DATABASE_SSL_REJECT_UNAUTHORIZED`**).

Put the **shared** **`DATABASE_URL`** in **`.env`** (from your team vault — never commit).

```bash
npm run db:deploy   # apply migrations to that DB (run again when migrations change)
npm run db:seed     # optional, once per fresh DB or as agreed by the team
npm run dev
```

Use **`db:migrate`** when iteratively creating migrations against **your** machine; use **`db:deploy`** to apply **existing** migrations to **shared** or production databases.

### New teammate checklist

1. Clone repo, **`npm install`**, **`cp .env.example .env`**.
2. Paste **`DATABASE_URL`** + shared integration keys from vault (**Groq**, **Google**, **Resend**, etc.) — **do not** paste secrets in Slack or GitHub.
3. Set **`AUTH_SECRET`** locally (`openssl rand -base64 32`).
4. **`AUTH_URL=http://localhost:3000`**
5. **`npm run db:deploy`** if the repo added new migrations since your last pull.
6. **`npm run dev`**

---

## Sign-in

- **Email + password** (minimum length in [`src/lib/auth/password.ts`](src/lib/auth/password.ts)).
- **Open sign-up** (name + email + password on **`/login`**) unless **`AUTH_INVITE_ONLY=true`** — then only existing **`User`** rows can sign in.
- **Everyone sets their own password** on first successful login (including seeded emails — no shared demo password).

Seeded accounts are listed under **`SEED_WORKSPACE_USERS`** in [`src/lib/constants.ts`](src/lib/constants.ts). Add people via sign-up, seed changes + **`npm run db:seed`**, or DB inserts. **Settings → Sign-in & team** lists workspace users.

If login fails: confirm Postgres is reachable, migrations applied, and **`AUTH_INVITE_ONLY`** isn’t blocking you.

---

## Hosting (production)

Deploy on **Render** with **`render.yaml`** (managed Postgres + web service). Owner vs operator responsibilities, cron, OAuth redirects: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

| Must set on Render | Notes |
|--------------------|--------|
| **`AUTH_URL`** | Public `https://…` URL, no trailing slash |
| **`AUTH_SECRET`**, **`CRON_SECRET`** | Generate new values for production |
| Integration keys | Same providers as local; paste in Render **Environment** |

Production **`DATABASE_URL`** is normally **injected** by Render from the blueprint database — not copied from a developer laptop.

---

## Environment variables

Copy **`.env.example`** → **`.env`**, then add any optional keys from the **Environment variables** section below (and [`src/lib/env.ts`](src/lib/env.ts)).

### Core

| Variable | Purpose |
|----------|---------|
| **`DATABASE_URL`** | PostgreSQL URL (defaults to local Docker URL if unset) |
| **`AUTH_SECRET`** | NextAuth signing |
| **`AUTH_URL`** | App origin (`http://localhost:3000` locally; `https://…` on Render) |

### Common optional keys

| Variable | Purpose |
|----------|---------|
| **`AUTH_INVITE_ONLY`** | `true` — disable open sign-up |
| **`PG_POOL_MAX`** | Cap `pg` pool size |
| **`GROQ_*`** | AI + transcription |
| **`GOOGLE_*`** | Calendar OAuth |
| **`RESEND_*`**, **`EMAIL_FROM`** | Email / digests |
| **`EMAIL_DIGEST_OUTBOUND_TO`** | Force all digests to one inbox (e.g. Resend test); omit for per-user **`User.email`** |
| **`CRON_SECRET`** | Protects **`POST /api/cron/reminders`** |
| **`WISPR_WEBHOOK_SECRET`** | Wispr webhook verification |
| **`DATABASE_SSL_REJECT_UNAUTHORIZED`** | Set to **`false`** only on **trusted dev machines** if TLS to Postgres fails (e.g. VPN SSL inspection). **Never** use lightly on production. |

---

## Scripts

| Command | Description |
|---------|-------------|
| **`npm run dev`** | Dev server |
| **`npm run build`** | `prisma generate` + `next build` |
| **`npm run vercel-build`** | `generate` + **`migrate deploy`** + `next build` |
| **`npm run start`** | Production server |
| **`npm run db:migrate`** | Dev migrations (`prisma migrate dev`) |
| **`npm run db:deploy`** | Apply migrations (`prisma migrate deploy`) — shared DB & production |
| **`npm run db:seed`** | Seed workspace sample data |
| **`npm run lint`** | ESLint |

---

## Email digests

Digests summarize **your** open tasks (overdue / today / this week) and **meetings today** when Google Calendar is connected.

- **Settings** in-app: send test digest, workspace digest, outbox history.
- **Production**: scheduler calls **`POST /api/cron/reminders`** with **`Authorization: Bearer <CRON_SECRET>`** — see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Without Resend configured, messages may stay **outbox-only**. Omit **`EMAIL_DIGEST_OUTBOUND_TO`** unless you intentionally redirect every digest to one address.

---

## Troubleshooting (quick links)

| Topic | Doc |
|-------|-----|
| Render deploy, cron, OAuth URLs | **[DEPLOYMENT.md](./DEPLOYMENT.md)** |
| Supabase / shared **`DATABASE_URL`**, IPv4 pooler, TLS **`P1011`** | **[TEAM_DATABASE.md](./TEAM_DATABASE.md)** |

---

## Repository layout

| Path | Role |
|------|------|
| **`src/app/`** | Routes & API |
| **`src/server/actions/`** | Server actions |
| **`src/lib/`** | Env, DB, auth, domains |
| **`prisma/`** | Schema, migrations, seed |
| **`docker-compose.yml`** | Local Postgres |
| **`render.yaml`** | Render blueprint |
| **`DEPLOYMENT.md`** | Production & operator checklist |
| **`TEAM_DATABASE.md`** | Shared remote Postgres for development |

---

## License

Private / internal unless noted otherwise.
