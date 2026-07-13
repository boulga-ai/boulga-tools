"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mic, Copy, RotateCcw, Minus, Plus } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useStreaming } from "@/hooks/useStreaming";

const SPEECH_TYPES = [
  { value: "pitch_elevator", label: "Pitch elevator (1-2 min)" },
  { value: "pitch_investor", label: "Pitch investisseur (5-10 min)" },
  { value: "pitch_commercial", label: "Pitch commercial" },
  { value: "formal", label: "Discours formel (ceremonie, inauguration)" },
  { value: "professional", label: "Presentation professionnelle" },
  { value: "motivation", label: "Discours de motivation" },
  { value: "toast", label: "Toast / discours d'occasion" },
  { value: "soutenance", label: "Soutenance (memoire, these)" },
];

const DURATIONS = ["1 min", "3 min", "5 min", "10 min", "15 min", "30 min"];

const TONES = ["Professionnel", "Inspirant", "Solennel", "Decontracte", "Persuasif"];

const WORDS_PER_MINUTE = 130;

function durationIndex(duration: string): number {
  const idx = DURATIONS.indexOf(duration);
  return idx === -1 ? 2 : idx;
}

export default function SpeechWriterPage() {
  const { profile } = useAuth();
  const [speechType, setSpeechType] = useState("pitch_commercial");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [duration, setDuration] = useState("5 min");
  const [tone, setTone] = useState("Professionnel");
  const [instructions, setInstructions] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const { text: output, isStreaming, error, start } = useStreaming();

  const available = profile ? profile.current_tier !== "introduction" : false;
  const canSubmit = context.trim() && audience.trim() && keyPoints.trim() && available;

  async function generate(overrideDuration?: string) {
    if (!canSubmit) return;
    let wordCount = 0;
    await start(
      "/api/v1/tools/transformers/speech-writer",
      {
        speech_type: speechType,
        context,
        audience,
        key_points: keyPoints,
        duration: overrideDuration ?? duration,
        tone,
        specific_instructions: instructions || undefined,
      },
      {
        onDone: (data) => {
          const payload = data as { words: number };
          wordCount = payload.words;
          setEstimatedMinutes(Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)));
        },
      },
    );
  }

  function adjustDuration(direction: "shorter" | "longer") {
    const idx = durationIndex(duration);
    const nextIdx =
      direction === "shorter" ? Math.max(0, idx - 1) : Math.min(DURATIONS.length - 1, idx + 1);
    const nextDuration = DURATIONS[nextIdx];
    setDuration(nextDuration);
    generate(nextDuration);
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success("Discours copie");
  }

  return (
    <ToolLayout
      title="Discours et pitchs"
      description="Redige un discours, un pitch commercial ou une preparation de soutenance."
      badge={
        !available ? (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Des le palier Goutte
          </span>
        ) : undefined
      }
    >
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Type de discours</Label>
            <Select value={speechType} onValueChange={(value) => value && setSpeechType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type de discours" />
              </SelectTrigger>
              <SelectContent>
                {SPEECH_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="context">Contexte / occasion</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Presentation de mon startup devant des investisseurs..."
              className="min-h-20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audience">Audience</Label>
            <Input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="20 investisseurs, profils tech et finance"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="keyPoints">Points cles a couvrir</Label>
            <Textarea
              id="keyPoints"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="Notre solution resout X, marche de Y milliards..."
              className="min-h-20"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Duree souhaitee</Label>
              <Select value={duration} onValueChange={(value) => value && setDuration(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Duree" />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={(value) => value && setTone(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ton" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructions">Instructions particulieres (optionnel)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-16"
            />
          </div>

          <Button onClick={() => generate()} disabled={isStreaming || !canSubmit} className="w-fit">
            <Mic className="size-4" />
            {isStreaming ? "Redaction en cours..." : "Rediger le discours"}
          </Button>
          {!available && (
            <p className="text-sm text-muted-foreground">
              Cet outil necessite un abonnement a partir du palier Goutte.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <StreamingOutput text={output} isStreaming={isStreaming} />
          {error && <p className="text-sm text-erreur">{error}</p>}
          {estimatedMinutes !== null && !isStreaming && (
            <p className="text-sm text-muted-foreground">
              Duree estimee a l&apos;oral : environ {estimatedMinutes} min
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={!output}>
              <Copy className="size-4" />
              Copier
            </Button>
            <Button variant="outline" onClick={() => generate()} disabled={isStreaming || !canSubmit}>
              <RotateCcw className="size-4" />
              Regenerer
            </Button>
            <Button
              variant="outline"
              onClick={() => adjustDuration("shorter")}
              disabled={isStreaming || !canSubmit}
            >
              <Minus className="size-4" />
              Version plus courte
            </Button>
            <Button
              variant="outline"
              onClick={() => adjustDuration("longer")}
              disabled={isStreaming || !canSubmit}
            >
              <Plus className="size-4" />
              Version plus longue
            </Button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
