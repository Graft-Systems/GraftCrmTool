import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { requireSession } from "@/lib/session";

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const runtime = "nodejs";

type GroqTranscriptionResponse = {
  text?: string;
  error?: { message?: string };
};

export async function POST(request: Request) {
  await requireSession();

  const apiKey = env.groq.apiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured. Add it to .env to enable speech-to-text." },
      { status: 503 },
    );
  }

  let inboundForm: FormData;
  try {
    inboundForm = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with an audio field." }, { status: 400 });
  }

  const audio = inboundForm.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio blob." }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio is empty." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Audio exceeds 25 MB Groq limit. Trim or split the recording." },
      { status: 413 },
    );
  }

  const language = typeof inboundForm.get("language") === "string"
    ? String(inboundForm.get("language"))
    : "en";
  const filenameHint = typeof inboundForm.get("filename") === "string"
    ? String(inboundForm.get("filename"))
    : "recording.webm";

  const outboundForm = new FormData();
  outboundForm.append("file", audio, filenameHint);
  outboundForm.append("model", env.groq.whisperModel);
  outboundForm.append("response_format", "json");
  outboundForm.append("temperature", "0");
  outboundForm.append("language", language);

  const response = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: outboundForm,
  });

  let payload: GroqTranscriptionResponse | null = null;
  try {
    payload = (await response.json()) as GroqTranscriptionResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ?? `Groq transcription failed with status ${response.status}.`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const text = payload?.text?.trim() ?? "";
  return NextResponse.json({ transcript: text, model: env.groq.whisperModel });
}
