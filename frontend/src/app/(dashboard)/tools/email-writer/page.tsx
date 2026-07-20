// components/tools/EmailWriter.tsx
"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ChatInput } from "@/components/tools/ChatInput";
import { EmailOutput } from "@/components/tools/EmailOutput";
import { GenerationError } from "@/components/tools/GenerationError";
import { RefineBar } from "@/components/tools/RefineBar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStreaming } from "@/hooks/useStreaming";
import { apiFetch } from "@/lib/api";

const TONES = [
  { value: "professionnel", label: "Professionnel" },
  { value: "convivial", label: "Convivial" },
  { value: "formel", label: "Formel" },
  { value: "neutre", label: "Neutre" },
];

type HistoryItem = { id: string; title: string; created_at: string };

export default function EmailWriterPage() {
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("professionnel");
  const [subject, setSubject] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { text: output, isStreaming, error, isQuotaError, start, stop, setText } = useStreaming();

  useEffect(() => {
    apiFetch("/api/v1/tools/transformers/email-writer/history").then((res) => {
      if (res.ok) res.json().then(setHistory);
    });
  }, []);

  async function refreshHistory() {
    const res = await apiFetch("/api/v1/tools/transformers/email-writer/history");
    if (res.ok) setHistory(await res.json());
  }

  async function handleSubmit(text: string) {
    await start("/api/v1/tools/transformers/email-writer", {
      description: text,
      tone,
      subject: subject || undefined,
      extra_details: extraDetails || undefined,
    });
    refreshHistory();
  }

  async function handleRefine(instruction: string) {
    await start("/api/v1/tools/transformers/email-writer", {
      description,
      tone,
      subject: subject || undefined,
      extra_details: extraDetails || undefined,
      previous_output: output,
      refine_instruction: instruction,
    });
    refreshHistory();
  }

  async function openHistoryItem(id: string) {
    const res = await apiFetch(`/api/v1/tools/transformers/email-writer/history/${id}`);
    if (!res.ok) return;
    const conversation = await res.json();
    const assistantMessage = conversation.messages_json?.find(
      (m: { role: string; content: string }) => m.role === "assistant",
    );
    if (assistantMessage) setText(assistantMessage.content);
  }

  return (
    <ToolLayout
      title="Rédacteur d'email pro"
      description="Décrivez la situation, l'IA rédige un email professionnel complet."
    >
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_1fr]">
        <div className="order-3 flex flex-col gap-2 lg:order-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            Historique
          </p>
          <div className="flex flex-col gap-1">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun email généré pour le moment.</p>
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
          <div className="flex flex-col gap-1.5">
            <Label>Ton</Label>
            <Select value={tone} onValueChange={(value) => value && setTone(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Décrivez l&apos;email que vous souhaitez rédiger</Label>
            <ChatInput
              onSend={handleSubmit}
              value={description}
              onValueChange={setDescription}
              placeholder="Ex : Je dois relancer un client qui n'a pas payé sa facture depuis 3 semaines..."
              isStreaming={isStreaming}
              onStop={stop}
              clearOnSend={false}
              className="static shadow-none"
              settingsSlot={
                <div className="flex flex-col gap-2">
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Objet de l'email (optionnel)"
                  />
                  <Textarea
                    value={extraDetails}
                    onChange={(e) => setExtraDetails(e.target.value)}
                    placeholder="Précisions supplémentaires (optionnel)"
                    className="min-h-16"
                  />
                </div>
              }
            />
          </div>
        </div>

        <div className="order-2 flex flex-col gap-3 lg:order-3">
          <EmailOutput text={output} isStreaming={isStreaming} onRegenerate={() => handleSubmit(description)} />
          {error && (
            <GenerationError
              message={error}
              isQuotaError={isQuotaError}
              onRetry={() => handleSubmit(description)}
            />
          )}
          {output && !isStreaming && (
            <RefineBar
              presets={["Plus court", "Plus long", "Plus formel", "Plus direct"]}
              onRefine={handleRefine}
              disabled={isStreaming}
            />
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
