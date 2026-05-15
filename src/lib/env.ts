function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function parseEmailList(raw: string | undefined): string[] | null {
  const value = trim(raw);
  if (!value) return null;
  const emails = value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return emails.length > 0 ? emails : null;
}

/**
 * Single source of truth for environment variables.
 * Add new keys here and in `.env.example` — avoid reading `process.env` elsewhere.
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
    return trim(process.env.DATABASE_URL) ?? "file:./dev.db";
  },

  get auth() {
    const url = (trim(process.env.AUTH_URL) ?? "http://localhost:3000").replace(/\/$/, "");
    return {
      secret: trim(process.env.AUTH_SECRET),
      url,
      allowedEmails: parseEmailList(process.env.ALLOWED_EMAILS),
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

export function getAllowedEmailList() {
  return env.auth.allowedEmails;
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
