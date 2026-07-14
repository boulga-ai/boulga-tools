"use client";

import { useState } from "react";
import { Mic, RotateCcw, Minus, Plus, ChevronRight, Square } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { RefineBar } from "@/components/tools/RefineBar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useStreaming } from "@/hooks/useStreaming";
import { cn } from "@/lib/utils";

const SPEECH_TYPES: { value: string; label: string; placeholder: string }[] = [
  {
    value: "pitch_commercial",
    label: "Pitch commercial",
    placeholder:
      "Ex : Je présente ma startup de logistique devant 20 investisseurs, notre solution résout le problème du dernier kilomètre...",
  },
  {
    value: "soutenance",
    label: "Pitch de soutenance",
    placeholder:
      "Ex : Je soutiens mon mémoire sur la transformation digitale des PME au Burkina Faso, devant un jury de 3 professeurs...",
  },
  {
    value: "ceremoniel",
    label: "Discours cérémoniel",
    placeholder: "Ex : Discours d'ouverture pour la cérémonie de remise de diplômes de l'université...",
  },
  {
    value: "prise_parole",
    label: "Prise de parole en public",
    placeholder:
      "Ex : Je dois présenter les résultats du trimestre devant toute mon équipe lors de notre réunion mensuelle...",
  },
];

const DURATIONS = ["3 min", "5 min", "10 min", "15 min", "20 min"];

const TONES = ["Professionnel", "Inspirant", "Solennel", "Décontracté", "Persuasif"];

function durationIndex(duration: string): number {
  const idx = DURATIONS.indexOf(duration);
  return idx === -1 ? 1 : idx;
}

export default function SpeechWriterPage() {
  const { profile } = useAuth();
  const [speechType, setSpeechType] = useState("pitch_commercial");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("5 min");
  const [tone, setTone] = useState("Professionnel");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [keyPoints, setKeyPoints] = useState("");
  const [audienceInfo, setAudienceInfo] = useState("");
  const { text: output, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const available = profile ? profile.current_tier !== "introduction" : false;
  const canSubmit = description.trim().length > 0 && available;
  const currentPlaceholder =
    SPEECH_TYPES.find((t) => t.value === speechType)?.placeholder ?? "";
  const estimatedMinutes = output
    ? Math.max(1, Math.round(output.trim().split(/\s+/).length / 130))
    : null;

  async function generate(overrideDuration?: string) {
    if (!canSubmit) return;
    await start("/api/v1/tools/transformers/speech-writer", {
      speech_type: speechType,
      description,
      duration: overrideDuration ?? duration,
      tone,
      key_points: keyPoints || undefined,
      audience_info: audienceInfo || undefined,
    });
  }

  async function handleRefine(instruction: string) {
    if (!canSubmit) return;
    await start("/api/v1/tools/transformers/speech-writer", {
      speech_type: speechType,
      description,
      duration,
      tone,
      key_points: keyPoints || undefined,
      audience_info: audienceInfo || undefined,
      previous_output: output,
      refine_instruction: instruction,
    });
  }

  function adjustDuration(direction: "shorter" | "longer") {
    const idx = durationIndex(duration);
    const nextIdx =
      direction === "shorter" ? Math.max(0, idx - 1) : Math.min(DURATIONS.length - 1, idx + 1);
    const nextDuration = DURATIONS[nextIdx];
    setDuration(nextDuration);
    generate(nextDuration);
  }

  return (
    <ToolLayout
      title="Discours et pitchs"
      description="Décrivez votre discours, l'IA le structure pour l'oral."
      badge={
        !available ? (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Dès le palier Goutte
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
            <Label htmlFor="description">Décrivez votre discours</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={currentPlaceholder}
              className="min-h-28"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Durée souhaitée</Label>
              <Select value={duration} onValueChange={(value) => value && setDuration(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Durée" />
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

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className={cn("size-3.5 transition-transform", advancedOpen && "rotate-90")} />
              Options avancées
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="keyPoints">Points spécifiques à couvrir (optionnel)</Label>
                <Textarea
                  id="keyPoints"
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  className="min-h-16"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audienceInfo">Informations sur l&apos;audience (optionnel)</Label>
                <Input
                  id="audienceInfo"
                  value={audienceInfo}
                  onChange={(e) => setAudienceInfo(e.target.value)}
                  placeholder="20 investisseurs, profils tech et finance..."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-2">
            <Button onClick={() => generate()} disabled={isStreaming || !canSubmit} className="w-fit">
              <Mic className="size-4" />
              {isStreaming ? "Rédaction en cours..." : "Rédiger le discours"}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stop} className="w-fit">
                <Square className="size-4" />
                Arrêter
              </Button>
            )}
          </div>
          {!available && (
            <p className="text-sm text-muted-foreground">
              Cet outil nécessite un abonnement à partir du palier Goutte.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <StreamingOutput text={output} isStreaming={isStreaming} />
          {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={() => generate()} />}
          {estimatedMinutes !== null && !isStreaming && (
            <p className="text-sm text-muted-foreground">
              Durée estimée de lecture : environ {estimatedMinutes} min
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <CopyButton text={output} label="Copier le discours" disabled={isStreaming} />
            <Button variant="outline" onClick={() => generate()} disabled={isStreaming || !canSubmit}>
              <RotateCcw className="size-4" />
              Régénérer
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
          {output && !isStreaming && (
            <RefineBar
              presets={["Plus solennel", "Plus simple", "Plus percutant"]}
              onRefine={handleRefine}
              disabled={isStreaming}
            />
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
