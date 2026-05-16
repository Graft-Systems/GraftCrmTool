# Shared team database (one Postgres for everyone)

Use this when the whole team should hit **the same data** while developing — instead of each laptop’s `localhost` Postgres.

> **Not automated:** Someone on the team creates the Supabase project (~5 minutes). This doc walks through that and wiring **`DATABASE_URL`**.

**Keep production separate:** The database Render creates via **`render.yaml`** is for **production**. For shared dev, use a **Supabase project** (or another hosted DB) — do **not** point everyday dev laptops at prod unless you accept that risk.

---

## Option A — Supabase (recommended here)

### 1. Create the project

1. Sign up / log in at [https://supabase.com](https://supabase.com).
2. **New project** → choose **organization**, **name**, **database password** (save it in your team vault — you need it for the connection string).
3. Pick a **region** close to most of the team; Postgres version **15** or **16** is fine.

### 2. Get `DATABASE_URL`

1. In the Supabase dashboard: **Project Settings** (gear) → **Database**.
2. Under **Connection string**, choose the **URI** format.
3. Use the **direct** connection (host like `db.<project-ref>.supabase.co`, port **`5432`**) for **`npm run db:deploy`** — simplest with Prisma migrations.
4. Replace **`[YOUR-PASSWORD]`** with your actual database password (URL-encode special characters in the password if needed, e.g. `@` → `%40`).
5. Ensure the query string includes SSL, e.g. **`?sslmode=require`**. If Supabase’s URI already has `?sslmode=require`, keep it; if not, append it.

Example shape only — **always copy from Project Settings → Database** (your host and user may differ):

```text
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres?sslmode=require
```

Use the URI Supabase labels for **direct** access on port **5432** for migrations — do not invent the hostname.

**Pooling (optional):** If you later switch to the **pooler** (often port **6543**) for many concurrent dev connections, Prisma may need extra params (see [Supabase + Prisma](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)). Start with **direct 5432** unless you hit limits.

**IPv4:** If connections fail from some networks, check Supabase docs for **IPv4 compatibility** / add-ons — rare on normal home/office internet.

### 3. Apply schema once, then share

**One person** runs:

```bash
export DATABASE_URL="postgresql://…"   # full Supabase URI from dashboard
npm run db:deploy
npm run db:seed    # optional — shared demo workspace + seeded emails
```

### 4. Team `.env`

1. Share **`DATABASE_URL`** securely (1Password, Bitwarden, etc.) — **never** commit `.env`.
2. Each developer sets the **same** `DATABASE_URL` in local `.env`.
3. Keep **`AUTH_URL=http://localhost:3000`** per machine for local Next.js.

```bash
npm install
cp .env.example .env   # add shared DATABASE_URL + your AUTH_SECRET, keys, etc.
npm run dev
```

---

## Option B — Neon

1. [https://neon.tech](https://neon.tech) → new project → copy connection string (`sslmode=require` usually included).
2. Same commands: `DATABASE_URL="…" npm run db:deploy` and optional `npm run db:seed`; share URL with the team.

---

## Option C — Second Postgres on Render

1. Render → **New → PostgreSQL** → copy connection URL from **Connections**.
2. Same **`db:deploy`** / **`db:seed`** / share workflow.

---

## Checklist

| Step | Owner |
|------|--------|
| Create Supabase project + save DB password | One teammate |
| Run `npm run db:deploy` once | Same person (after schema changes, anyone can run again) |
| Run `npm run db:seed` once (optional) | Team agreement |
| Put `DATABASE_URL` in `.env` | Every developer |
| Store canonical URL + password in team vault | Owner rotates if password reset |

---

## Troubleshooting

- **`P1001` / connection refused / timeout** — Wrong URI; password typo; URL-encode special chars in password; IPv4/network issues (Supabase dashboard hints).
- **`P1011` / `self-signed certificate in certificate chain`** (TLS) — Often **VPN / antivirus HTTPS scanning** or stricter Node `pg` SSL behavior.
  1. Append to your **`DATABASE_URL`** query string: **`uselibpqcompat=true`** (e.g. `?sslmode=require&uselibpqcompat=true`).
  2. If it still fails, on **development only** set **`DATABASE_SSL_REJECT_UNAUTHORIZED=false`** in `.env` (never on production). Then rerun **`npm run db:seed`** / **`npm run dev`**.
- **`relation does not exist`** — Run **`npm run db:deploy`** with the shared `DATABASE_URL`.
- **Mixed local vs remote** — If `.env` still uses `localhost`, you are **not** on the shared Supabase DB.

---

## Personal laptop-only DB (not shared)

If someone prefers **their own** data: **`docker compose up -d`** and  

`DATABASE_URL="postgresql://graft:graft@localhost:5432/graft_crm"`  

—that does **not** share data with Supabase unless everyone uses the same hosted URL.
