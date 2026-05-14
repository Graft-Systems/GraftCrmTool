"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type VoiceRecorderProps = {
  onTranscriptChange: (value: string) => void;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function VoiceRecorder({ onTranscriptChange }: VoiceRecorderProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    onTranscriptChange(transcript);
  }, [onTranscriptChange, transcript]);

  const statusLabel = useMemo(() => {
    if (!supported) {
      return "Voice capture is not supported in this browser. Use paste instead.";
    }

    return listening ? "Listening… speak naturally and pause when finished." : "Ready to capture.";
  }, [listening, supported]);

  function startListening() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let next = transcriptRef.current;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) {
          continue;
        }

        const spoken = result[0]?.transcript?.trim();
        if (spoken) {
          next = next ? `${next} ${spoken}` : spoken;
        }
      }

      transcriptRef.current = next.trim();
      setTranscript(transcriptRef.current);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{statusLabel}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={startListening} disabled={!supported || listening}>
          Start recording
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={stopListening}
          disabled={!supported || !listening}
        >
          Stop
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            transcriptRef.current = "";
            setTranscript("");
          }}
          disabled={!transcript}
        >
          Clear
        </Button>
      </div>
      <textarea
        value={transcript}
        onChange={(event) => {
          transcriptRef.current = event.target.value;
          setTranscript(event.target.value);
        }}
        rows={8}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        placeholder="Transcript appears here. You can edit it before structuring."
      />
    </div>
  );
}
