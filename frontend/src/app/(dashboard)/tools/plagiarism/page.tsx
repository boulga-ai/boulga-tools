"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, Loader2, ExternalLink, Square } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { MarkdownContent } from "@/components/tools/MarkdownContent";
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
import { apiFetch } from "@/lib/api";

const TONES = [
  { value: "convivial", label: "Convivial" },
  { value: "academique", label: "Académique" },
  { value: "professionnel", label: "Professionnel" },
  { value: "neutre", label: "Neutre" },
  { value: "persuasif", label: "Persuasif" },
  { value: "formel", label: "Formel / Soutenu" },
];

type FlaggedSpan = {
  text: string;
  start: number;
  end: number;
  similarity: number;
  source_url: string;
};

type ScanResult = {
  text: string;
  similarity_score: number;
  flagged_spans: FlaggedSpan[];
};

export default function PlagiarismPage() {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tone, setTone] = useState<string | undefined>(undefined);
  const { text: correction, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const canCorrect = profile ? profile.current_tier !== "introduction" : false;

  async function handleScan() {
    if (!text.trim() && !file) return;
    setSubmitting(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      else formData.append("text", text);

      const res = await apiFetch("/api/v1/tools/analyzers/plagiarism/scan", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Échec de la vérification.");
      }
      setResult(await res.json());
    } catch (err) {
      toast.error("Vérification impossible", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCorrect() {
    if (!result || !canCorrect) return;
    await start("/api/v1/tools/analyzers/plagiarism/correct", {
      text: result.text,
      flagged_passages: result.flagged_spans.map((s) => s.text),
      tone,
    });
  }

  return (
    <ToolLayout
      title="Vérificateur de plagiat"
      description="Estime le taux de contenu potentiellement plagié dans un texte."
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Score gratuit
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFile(null);
          }}
          placeholder="Collez le texte à vérifier..."
          maxLength={50000}
          className="min-h-32"
          disabled={!!file}
        />
        <p className="text-center text-xs text-muted-foreground">ou</p>
        <DropZone
          onFiles={(files) => {
            setFile(files[0]);
            setText("");
          }}
          accept=".pdf,.docx,.txt"
          label="Glissez-déposez un PDF, DOCX ou TXT, ou"
        />
        {file && <p className="text-sm text-muted-foreground">Fichier sélectionné : {file.name}</p>}

        <Button onClick={handleScan} disabled={submitting || (!text.trim() && !file)} className="w-fit">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
          {submitting ? "Analyse en cours..." : "Vérifier le plagiat"}
        </Button>
      </div>

      {result && (
        <div className="flex flex-col gap-4 border-t pt-6">
          <div>
            <p className="text-2xl font-semibold text-erreur">{result.similarity_score}%</p>
            <p className="text-sm text-muted-foreground">de contenu potentiellement similaire</p>
          </div>

          <div className="flex flex-col gap-2">
            {result.flagged_spans.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun passage suspect détecté.</p>
            )}
            {result.flagged_spans.map((span, i) => (
              <div key={i} className="rounded-[8px] border bg-attention/10 p-3 text-sm">
                <p>{span.text}</p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{span.similarity}% de similarité</span>
                  <a
                    href={span.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-bleu-boulga hover:underline"
                  >
                    Source <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {result.flagged_spans.length > 0 && (
            <div className="flex flex-col gap-3 border-t pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3>Corriger les passages détectés</h3>
                {!canCorrect && (
                  <span className="rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
                    Dès le palier Goutte
                  </span>
                )}
              </div>

              {canCorrect ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={tone} onValueChange={(v) => setTone(v ?? undefined)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Ton" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCorrect} disabled={isStreaming}>
                    {isStreaming ? "Correction en cours..." : "Corriger les passages détectés"}
                  </Button>
                  {isStreaming && (
                    <Button variant="outline" onClick={stop}>
                      <Square className="size-4" />
                      Arrêter
                    </Button>
                  )}
                </div>
              ) : (
                <a href="/settings">
                  <Button variant="outline">Voir les paliers</Button>
                </a>
              )}

              {(correction || isStreaming) && (
                <div className="rounded-[12px] border bg-card p-4 text-sm">
                  <MarkdownContent text={correction} />
                  {isStreaming && (
                    <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-bleu-boulga align-text-bottom" />
                  )}
                </div>
              )}
              {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={handleCorrect} />}
              {correction && !isStreaming && (
                <CopyButton text={correction} label="Copier la correction" variant="outline" className="w-fit" />
              )}
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
