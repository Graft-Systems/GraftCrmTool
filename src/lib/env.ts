function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

const DEFAULT_LOCAL_DATABASE_URL = "postgresql://graft:graft@localhost:5432/graft_crm";

function isDirectPostgresUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.startsWith("postgresql://") || u.startsWith("postgres://");
}

/**
 * Single source of truth for environment variables.
 * Add new keys here and document them in README (optional keys are not listed in `.env.example`).
 *
 * Values are read lazily (getters) so they are not snapshotted when this module is
 * first evaluated in a non-server context during bundling — and middleware must not
 * import this module; only edge-safe callers should touch `AUTH_SECRET` directly.
 */
export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },

  get databaseUrl() {
    const raw = trim(process.env.DATABASE_URL);
    if (!raw) {
      return DEFAULT_LOCAL_DATABASE_URL;
    }

    // Prisma uses the `pg` driver — SQLite `file:` URLs from older setups break at runtime
    // (queries surface as PrismaClientKnownRequestError / ECONNREFUSED).
    if (raw.startsWith("file:")) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          'DATABASE_URL uses SQLite (`file:`); this app requires PostgreSQL. Set `DATABASE_URL` to a `postgresql://` URL — see README / DEPLOYMENT.md.',
        );
      }

      console.warn(
        `[graft-crm] DATABASE_URL is SQLite (\`${raw}\`); using local Postgres ${DEFAULT_LOCAL_DATABASE_URL}. Update .env or run: docker compose up -d`,
      );
      return DEFAULT_LOCAL_DATABASE_URL;
    }

    if (!isDirectPostgresUrl(raw)) {
      throw new Error(
        `DATABASE_URL must start with postgresql:// or postgres:// (got ${JSON.stringify(raw.slice(0, 24))}…).`,
      );
    }

    return raw;
  },

  get auth() {
    const url = (trim(process.env.AUTH_URL) ?? "http://localhost:3000").replace(/\/$/, "");
    return {
      secret: trim(process.env.AUTH_SECRET),
      url,
      /** When true, only existing `User` rows can sign in (no auto-provisioning). */
      inviteOnly: trim(process.env.AUTH_INVITE_ONLY) === "true",
    } as const;
  },

  get groq() {
    return {
      apiKey: trim(process.env.GROQ_API_KEY),
      model: trim(process.env.GROQ_MODEL) ?? "llama-3.1-8b-instant",
      whisperModel: trim(process.env.GROQ_WHISPER_MODEL) ?? "whisper-large-v3-turbo",
    } as const;
  },

  get google() {
    const authUrl = (trim(process.env.AUTH_URL) ?? "http://localhost:3000").replace(/\/$/, "");
    return {
      clientId: trim(process.env.GOOGLE_CLIENT_ID),
      clientSecret: trim(process.env.GOOGLE_CLIENT_SECRET),
      redirectUri:
        trim(process.env.GOOGLE_REDIRECT_URI) ?? `${authUrl}/api/calendar/google/callback`,
    } as const;
  },

  get email() {
    return {
      resendApiKey: trim(process.env.RESEND_API_KEY),
      from: trim(process.env.EMAIL_FROM) ?? null,
      /** When set, digest emails are sent here instead of each user’s CRM email (Resend test mode). */
      digestOutboundOverride: trim(process.env.EMAIL_DIGEST_OUTBOUND_TO) ?? null,
    } as const;
  },

  get cron() {
    return {
      secret: trim(process.env.CRON_SECRET),
    } as const;
  },

  get wispr() {
    return {
      webhookSecret: trim(process.env.WISPR_WEBHOOK_SECRET),
    } as const;
  },
} as const;

export function getAppBaseUrl() {
  return env.auth.url;
}

export function getGoogleRedirectUri() {
  return env.google.redirectUri;
}

export function isGoogleCalendarConfigured() {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

export function isGroqConfigured() {
  return Boolean(env.groq.apiKey);
}

export function isResendConfigured() {
  return Boolean(env.email.resendApiKey && env.email.from);
}

export function isWisprWebhookConfigured() {
  return Boolean(env.wispr.webhookSecret);
}

export function isCronSecretConfigured() {
  return Boolean(env.cron.secret);
}
