"use client";

import { useState } from "react";
import { Wand2, RotateCcw, Square } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ReformulatorOutput } from "@/components/tools/ReformulatorOutput";
import { GenerationError } from "@/components/tools/GenerationError";
import { Textarea } from "@/components/ui/textarea";
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

const MODES = [
  { value: "reformulation", label: "Reformulation" },
  { value: "correction", label: "Correction" },
  { value: "simplification", label: "Simplification" },
  { value: "formalisation", label: "Formalisation" },
  { value: "academisation", label: "Académisation" },
];

const TONES = [
  { value: "convivial", label: "Convivial" },
  { value: "academique", label: "Académique" },
  { value: "professionnel", label: "Professionnel" },
  { value: "neutre", label: "Neutre" },
  { value: "persuasif", label: "Persuasif" },
  { value: "formel", label: "Formel / Soutenu" },
];

export default function ReformulatorPage() {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [mode, setMode] = useState("reformulation");
  const [tone, setTone] = useState<string | undefined>(undefined);
  const { text: output, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const toneEnabled = profile ? profile.current_tier !== "introduction" : false;

  async function handleSubmit() {
    if (!text.trim()) return;
    await start("/api/v1/tools/transformers/reformulator", {
      text,
      mode,
      tone: toneEnabled ? tone : undefined,
    });
  }

  return (
    <ToolLayout
      title="Reformulateur / Correcteur"
      description="Reformule, corrige, simplifie ou académise un texte selon le ton voulu."
    >
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Collez ou écrivez votre texte ici..."
            maxLength={50000}
            className="min-h-40 flex-1 resize-y"
          />
          <div className="flex flex-wrap gap-3">
            <Select value={mode} onValueChange={(value) => value && setMode(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Select
                value={tone}
                onValueChange={(value) => setTone(value ?? undefined)}
                disabled={!toneEnabled}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Ton (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!toneEnabled && (
                <span className="rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
                  Dès le palier Goutte
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSubmit} disabled={isStreaming || !text.trim()} className="w-fit">
              <Wand2 className="size-4" />
              {isStreaming ? "Transformation en cours..." : "Transformer"}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stop} className="w-fit">
                <Square className="size-4" />
                Arrêter
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ReformulatorOutput text={output} isStreaming={isStreaming} mode={mode} />
          {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={handleSubmit} />}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={isStreaming || !text.trim()}
              className="w-fit"
            >
              <RotateCcw className="size-4" />
              Régénérer
            </Button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
