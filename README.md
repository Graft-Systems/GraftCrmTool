# Graft CRM

Company-first CRM for **Graft Systems**: companies, follow-ups, meetings, competitions, investors, capital runway, voice capture (Wispr), and email digests.

Built with **Next.js** (App Router), **React 19**, **Prisma** (SQLite), and **NextAuth** (credentials).

## Prerequisites

- **Node.js** 20+ recommended  
- **npm** (or compatible package manager)

## Quick start

```bash
git clone <repository-url>
cd graft-crm-tool
npm install
cp .env.example .env
```

Edit `.env` with at least the **Core** variables (see below), then:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to sign in.

### Sign-in (after seed)

Auth is **email-only** (no password): you must use an address listed in `ALLOWED_EMAILS` **and** present as a `User` row after seeding. Seeded examples:

- `owner@graft.systems`
- `teammate@graft.systems`

Those emails must be included in `ALLOWED_EMAILS` in `.env`. If sign-in fails on a fresh DB, run `npm run db:seed` again and confirm your email appears in both places.

---

## Environment variables

Copy `.env.example` → `.env`. **Single source of truth** for parsing is [`src/lib/env.ts`](src/lib/env.ts); prefer adding keys there and in `.env.example`, not scattered `process.env` reads.

### Core (required for local app)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file URL, e.g. `file:./dev.db` |
| `AUTH_SECRET` | NextAuth secret — generate: `openssl rand -base64 32` |
| `AUTH_URL` | App origin, e.g. `http://localhost:3000` (no trailing slash) |
| `ALLOWED_EMAILS` | Comma-separated emails allowed to sign in with credentials |

### Optional integrations

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | AI structuring + in-app transcription |
| `GROQ_MODEL` / `GROQ_WHISPER_MODEL` | Groq chat / Whisper model IDs |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth (meetings, invites) |
| `GOOGLE_REDIRECT_URI` | Defaults to `{AUTH_URL}/api/calendar/google/callback` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Send digest emails via [Resend](https://resend.com) |
| `EMAIL_DIGEST_OUTBOUND_TO` | Force all digests to one inbox (useful in Resend test mode) |
| `CRON_SECRET` | Protects `POST /api/cron/reminders` in production |
| `WISPR_WEBHOOK_SECRET` | Validates Wispr webhook payloads |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Apply migrations (`prisma migrate dev`) |
| `npm run db:seed` | Seed workspace, users, sample data |

---

## Email digests

Digests summarize **your** open follow-ups (overdue / due today / due this week) and **meetings today** from a connected Google account.

- **Settings** in the app: send a **test digest**, **run today’s digest** for the workspace, and view **recent digests** (sent / error / outbox-only).
- **Automation**: schedule an HTTP caller (e.g. GitHub Actions, or your host’s cron) to `POST` `/api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>` or `?token=<CRON_SECRET>`. Without that, digests only run when you trigger them from Settings or hit the route manually.

If Resend is not configured, messages may be stored as **outbox-only** without delivery.

---

## Production notes

- **`CRON_SECRET`**: In production, set a strong secret; the cron route rejects unauthenticated calls when `NODE_ENV` is production and the secret is set.
- **SQLite file DB**: Default `file:./dev.db` is fine on a single machine. Serverless / multi-instance hosts often need a **managed database** or a single persistent volume — plan migrations accordingly.
- **`AUTH_URL`**: Must match your public URL so OAuth and callbacks work.

---

## Project layout (high level)

| Path | Role |
|------|------|
| `src/app/` | App Router pages & API routes |
| `src/components/` | UI components |
| `src/server/actions/` | Server actions |
| `src/lib/` | Auth, env, DB, domain helpers |
| `prisma/` | Schema, migrations, seed |
| `public/brand/` | Logo assets |

---

## License

Private / internal unless noted otherwise.
