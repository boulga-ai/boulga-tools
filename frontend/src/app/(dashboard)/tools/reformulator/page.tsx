"use client";

import { useEffect, useState } from "react";
import { Wand2, RotateCcw, Square, Clock } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ReformulatorOutput } from "@/components/tools/ReformulatorOutput";
import { GenerationError } from "@/components/tools/GenerationError";
import { RichTextEditor } from "@/components/tools/RichTextEditor";
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
import { apiFetch } from "@/lib/api";

type HistoryItem = { id: string; title: string; created_at: string };

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const {
    text: output,
    isStreaming,
    error,
    isQuotaError,
    start,
    stop,
    setText: setOutput,
  } = useStreaming();

  const toneEnabled = profile ? profile.current_tier !== "introduction" : false;

  useEffect(() => {
    apiFetch("/api/v1/tools/transformers/reformulator/history").then((res) => {
      if (res.ok) res.json().then(setHistory);
    });
  }, []);

  async function refreshHistory() {
    const res = await apiFetch("/api/v1/tools/transformers/reformulator/history");
    if (res.ok) setHistory(await res.json());
  }

  async function openHistoryItem(id: string) {
    const res = await apiFetch(`/api/v1/tools/transformers/reformulator/history/${id}`);
    if (!res.ok) return;
    const conversation = await res.json();
    const messages = (conversation.messages_json ?? []) as { role: string; content: string }[];
    const userMessage = messages.find((m) => m.role === "user");
    const assistantMessage = messages.find((m) => m.role === "assistant");
    if (userMessage) setText(userMessage.content);
    if (assistantMessage) setOutput(assistantMessage.content);
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    await start("/api/v1/tools/transformers/reformulator", {
      text,
      mode,
      tone: toneEnabled ? tone : undefined,
    });
    refreshHistory();
  }

  return (
    <ToolLayout
      title="Reformulateur / Correcteur"
      description="Reformule, corrige, simplifie ou académise un texte selon le ton voulu."
    >
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[180px_1fr_1fr]">
        <div className="order-3 flex flex-col gap-2 lg:order-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            Historique
          </p>
          <div className="flex flex-col gap-1">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune transformation pour le moment.</p>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => openHistoryItem(item.id)}
                className="truncate rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {item.title || "Sans titre"}
              </button>
            ))}
          </div>
        </div>

        <div className="order-1 flex flex-col gap-3 lg:order-2">
          <RichTextEditor
            value={text}
            onChange={setText}
            placeholder="Collez ou écrivez votre texte ici..."
            className="min-h-40 flex-1"
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

        <div className="order-2 flex flex-col gap-3 lg:order-3">
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
