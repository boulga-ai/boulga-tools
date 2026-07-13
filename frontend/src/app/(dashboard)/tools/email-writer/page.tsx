"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Copy, Clock } from "lucide-react";
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
import { useStreaming } from "@/hooks/useStreaming";
import { apiFetch } from "@/lib/api";

const TONES = [
  { value: "convivial", label: "Convivial" },
  { value: "academique", label: "Academique" },
  { value: "professionnel", label: "Professionnel" },
  { value: "neutre", label: "Neutre" },
  { value: "persuasif", label: "Persuasif" },
  { value: "formel", label: "Formel / Soutenu" },
];

type HistoryItem = { id: string; title: string; created_at: string };

export default function EmailWriterPage() {
  const [context, setContext] = useState("");
  const [recipient, setRecipient] = useState("");
  const [objective, setObjective] = useState("");
  const [tone, setTone] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { text: output, isStreaming, error, start, setText } = useStreaming();

  async function loadHistory() {
    const res = await apiFetch("/api/v1/tools/transformers/email-writer/history");
    if (res.ok) setHistory(await res.json());
  }

  useEffect(() => {
    apiFetch("/api/v1/tools/transformers/email-writer/history").then((res) => {
      if (res.ok) res.json().then(setHistory);
    });
  }, []);

  async function handleSubmit() {
    if (!context.trim() || !recipient.trim() || !objective.trim()) return;
    await start("/api/v1/tools/transformers/email-writer", {
      context,
      recipient,
      objective,
      tone,
    });
    loadHistory();
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

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success("Email copie");
  }

  return (
    <ToolLayout
      title="Redacteur d'email pro"
      description="Genere un email professionnel complet a partir d'un contexte et d'un objectif."
    >
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_1fr]">
        <div className="order-3 flex flex-col gap-2 lg:order-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            Historique
          </p>
          <div className="flex flex-col gap-1">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun email genere pour le moment.</p>
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
            <Label htmlFor="context">Contexte</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Decrivez la situation..."
              className="min-h-24"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipient">Destinataire</Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Client, partenaire, recruteur..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="objective">Objectif de l&apos;email</Label>
            <Textarea
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Relancer une facture impayee, remercier, refuser poliment..."
              className="min-h-20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ton</Label>
            <Select value={tone} onValueChange={(value) => setTone(value ?? undefined)}>
              <SelectTrigger className="w-full">
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
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isStreaming || !context.trim() || !recipient.trim() || !objective.trim()}
            className="w-fit"
          >
            <Mail className="size-4" />
            {isStreaming ? "Redaction en cours..." : "Rediger l'email"}
          </Button>
        </div>

        <div className="order-2 flex flex-col gap-3 lg:order-3">
          <StreamingOutput text={output} isStreaming={isStreaming} />
          {error && <p className="text-sm text-erreur">{error}</p>}
          <Button variant="outline" onClick={handleCopy} disabled={!output} className="w-fit">
            <Copy className="size-4" />
            Copier
          </Button>
        </div>
      </div>
    </ToolLayout>
  );
}
