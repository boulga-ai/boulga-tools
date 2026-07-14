"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ScanSearch, Loader2, Square } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { ScoreGauge } from "@/components/tools/ScoreGauge";
import { HighlightedText } from "@/components/tools/HighlightedText";
import { CopyButton } from "@/components/tools/CopyButton";
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
import { apiFetch } from "@/lib/api";

const TONES = [
  { value: "convivial", label: "Convivial" },
  { value: "academique", label: "Académique" },
  { value: "professionnel", label: "Professionnel" },
  { value: "neutre", label: "Neutre" },
  { value: "persuasif", label: "Persuasif" },
  { value: "formel", label: "Formel / Soutenu" },
];

type ScanResult = {
  text: string;
  ai_score: number;
  human_score: number;
  flagged_spans: { start: number; end: number }[];
};

export default function AiDetectorPage() {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tone, setTone] = useState<string | undefined>(undefined);
  const { text: rewritten, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const canRewrite = profile ? profile.current_tier !== "introduction" : false;

  async function handleScan() {
    if (!text.trim() && !file) return;
    setScanning(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      else formData.append("text", text);

      const res = await apiFetch("/api/v1/tools/analyzers/ai-detector/scan", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Échec de l'analyse.");
      }
      setResult(await res.json());
    } catch (err) {
      toast.error("Analyse impossible", { description: (err as Error).message });
    } finally {
      setScanning(false);
    }
  }

  async function handleRewrite() {
    if (!result || !canRewrite) return;
    await start("/api/v1/tools/analyzers/ai-detector/rewrite", { text: result.text, tone });
  }

  return (
    <ToolLayout
      title="Détecteur de contenu IA"
      description="Estime la probabilité qu'un texte ait été généré par une IA."
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
          placeholder="Collez le texte à analyser..."
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

        <Button onClick={handleScan} disabled={scanning || (!text.trim() && !file)} className="w-fit">
          {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          {scanning ? "Analyse en cours..." : "Analyser"}
        </Button>
      </div>

      {result && (
        <div className="flex flex-col gap-4 border-t pt-6">
          <ScoreGauge aiScore={result.ai_score} humanScore={result.human_score} />

          <div className="rounded-[12px] border bg-card p-4 text-sm">
            <HighlightedText text={result.text} spans={result.flagged_spans} />
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3>Réécrire dans un autre ton</h3>
              {!canRewrite && (
                <span className="rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
                  Disponible dès le palier Goutte
                </span>
              )}
            </div>

            {canRewrite ? (
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
                <Button onClick={handleRewrite} disabled={isStreaming}>
                  {isStreaming ? "Réécriture en cours..." : "Réécrire"}
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

            {(rewritten || isStreaming) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Original</p>
                  <div className="min-h-32 rounded-[12px] border bg-card p-4 text-sm">
                    <HighlightedText text={result.text} spans={result.flagged_spans} />
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Version réécrite
                  </p>
                  <StreamingOutput text={rewritten} isStreaming={isStreaming} />
                </div>
              </div>
            )}
            {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={handleRewrite} />}
            {rewritten && !isStreaming && (
              <CopyButton text={rewritten} label="Copier la version réécrite" variant="outline" className="w-fit" />
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
