"use client";

import { useState, useTransition } from "react";

import { structureCaptureAction } from "@/app/(dashboard)/capture-actions";
import { CaptureReview } from "@/components/crm/capture-review";
import { VoiceRecorder } from "@/components/voice/voice-recorder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CaptureSource, StructuredCapture } from "@/lib/ai/types";

type CapturePanelProps = {
  companyId: string;
  contacts: Array<{ id: string; name: string }>;
};

export function CapturePanel({ companyId, contacts }: CapturePanelProps) {
  const [source, setSource] = useState<CaptureSource>("paste");
  const [transcript, setTranscript] = useState("");
  const [structured, setStructured] = useState<StructuredCapture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStructure(nextSource: CaptureSource) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await structureCaptureAction(companyId, {
          source: nextSource,
          transcript,
        });
        setSource(nextSource);
        setStructured(result);
      } catch (structureError) {
        setStructured(null);
        setError(
          structureError instanceof Error
            ? structureError.message
            : "Could not structure these notes.",
        );
      }
    });
  }

  if (structured) {
    return (
      <CaptureReview
        companyId={companyId}
        source={source}
        transcript={transcript}
        structured={structured}
        contacts={contacts}
        onBack={() => setStructured(null)}
      />
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div>
        <h3 className="font-medium">Capture notes</h3>
        <p className="text-sm text-muted-foreground">
          Record or paste notes, structure them with AI, then review before saving.
        </p>
      </div>

      <Tabs defaultValue="paste">
        <TabsList>
          <TabsTrigger value="paste">Paste</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="capture-paste">Pasted notes</Label>
            <Textarea
              id="capture-paste"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={8}
              placeholder="Paste Wispr scratchpad text or meeting notes here."
            />
          </div>
          <Button type="button" onClick={() => handleStructure("paste")} disabled={isPending}>
            {isPending ? "Structuring…" : "Structure pasted notes"}
          </Button>
        </TabsContent>
        <TabsContent value="voice" className="space-y-4">
          <VoiceRecorder onTranscriptChange={setTranscript} />
          <Button type="button" onClick={() => handleStructure("in_app_voice")} disabled={isPending}>
            {isPending ? "Structuring…" : "Structure voice transcript"}
          </Button>
        </TabsContent>
      </Tabs>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
