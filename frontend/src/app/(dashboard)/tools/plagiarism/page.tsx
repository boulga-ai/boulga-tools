"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Loader2, ExternalLink, Square, Clock } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { MarkdownContent } from "@/components/tools/MarkdownContent";
import { RichTextEditor } from "@/components/tools/RichTextEditor";
import { UploadedDocViewer } from "@/components/tools/UploadedDocViewer";
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

// Textes temoins pour tester l'outil sans coller son propre contenu.
const EXAMPLES = [
  {
    label: "Exemple avec passage copié",
    text: "La photosynthèse est le processus utilisé par les plantes, les algues et certaines bactéries pour convertir l'énergie lumineuse en énergie chimique, qui peut ensuite être utilisée pour alimenter les activités de l'organisme. Cette énergie chimique est stockée dans des molécules glucidiques, telles que les sucres, qui sont synthétisées à partir de dioxyde de carbone et d'eau.",
  },
  {
    label: "Exemple original",
    text: "Ma grand-mère avait sa propre théorie sur pourquoi le riz collait toujours au fond de la marmite les jours de pluie — elle disait que l'humidité changeait le comportement du feu, ce qui n'a probablement aucun sens scientifique, mais on n'a jamais réussi à la contredire vu que ça arrivait vraiment à chaque fois.",
  },
];

// GPTZero avertit en dessous de 100 mots — meme seuil ici, le score devient moins
// fiable sur un echantillon aussi court.
const LOW_CONFIDENCE_WORD_THRESHOLD = 100;

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
  sample_word_count: number;
};

type HistoryItem = { id: string; title: string; created_at: string };

export default function PlagiarismPage() {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  // Fichier reellement analyse par le dernier scan reussi — distinct de `file` (la
  // selection courante), voir ai-detector/page.tsx pour le meme pattern.
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [lastScanKey, setLastScanKey] = useState<string | null>(null);
  const [tone, setTone] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { text: correction, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const canCorrect = profile ? profile.current_tier !== "introduction" : false;

  useEffect(() => {
    apiFetch("/api/v1/tools/analyzers/plagiarism/history").then((res) => {
      if (res.ok) res.json().then(setHistory);
    });
  }, []);

  async function refreshHistory() {
    const res = await apiFetch("/api/v1/tools/analyzers/plagiarism/history");
    if (res.ok) setHistory(await res.json());
  }

  // Si le scan d'origine a uploade un fichier, l'historique renvoie une URL signee
  // (file_url) vers le bucket "uploads" — on la refetch pour reconstruire un File et
  // retrouver le rendu natif PDF/DOCX. Echec silencieux : on retombe sur le texte brut
  // surligne, jamais casser la reouverture de l'historique pour ca.
  async function openHistoryItem(id: string) {
    const res = await apiFetch(`/api/v1/tools/analyzers/plagiarism/history/${id}`);
    if (!res.ok) return;
    const conversation = await res.json();
    const messages = (conversation.messages_json ?? []) as { role: string; content: string }[];
    const userMessage = messages.find((m) => m.role === "user");
    const assistantMessage = messages.find((m) => m.role === "assistant");
    if (!userMessage || !assistantMessage) return;
    try {
      const { file_url: fileUrl, file_name: fileName, ...scanResult } = JSON.parse(
        assistantMessage.content,
      );
      setFile(null);
      setText(userMessage.content);
      setResult({ text: userMessage.content, ...scanResult });

      if (fileUrl && fileName) {
        try {
          const fileRes = await fetch(fileUrl);
          const blob = fileRes.ok ? await fileRes.blob() : null;
          setScannedFile(blob ? new File([blob], fileName, { type: blob.type }) : null);
        } catch {
          setScannedFile(null);
        }
      } else {
        setScannedFile(null);
      }
    } catch {
      toast.error("Impossible de recharger ce résultat.");
    }
  }

  // Identifie ce qui serait effectivement soumis a une relance, pour detecter si le
  // texte/fichier a change depuis le dernier scan (evite de rescanner pour rien).
  function computeScanKey(): string {
    return file ? `file:${file.name}:${file.size}` : `text:${text}`;
  }
  const isStale = result !== null && lastScanKey !== null && computeScanKey() !== lastScanKey;

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
      setLastScanKey(computeScanKey());
      setScannedFile(file);
      setResult(await res.json());
      refreshHistory();
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
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
        <div className="order-2 flex flex-col gap-2 lg:order-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            Historique
          </p>
          <div className="flex flex-col gap-1">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune vérification pour le moment.</p>
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

        <div className="order-1 flex flex-col gap-6 lg:order-2">
      <div className="flex flex-col gap-3">
        <RichTextEditor
          value={text}
          onChange={(value) => {
            setText(value);
            setFile(null);
          }}
          placeholder="Collez le texte à vérifier..."
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

        {!text.trim() && !file && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Ou testez avec un exemple :</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setText(ex.text)}
                  className="rounded-[4px] border px-2.5 py-1 text-xs text-muted-foreground hover:border-bleu-boulga hover:text-bleu-boulga"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleScan} disabled={submitting || (!text.trim() && !file)} className="w-fit">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
            {submitting ? "Analyse en cours..." : "Vérifier le plagiat"}
          </Button>
          {result && !submitting && (
            <span className={isStale ? "text-xs font-medium text-attention" : "text-xs text-muted-foreground"}>
              {isStale ? "Texte modifié — relancez l'analyse pour un résultat à jour" : "Résultat à jour pour ce texte"}
            </span>
          )}
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-4 border-t pt-6">
          {result.sample_word_count < LOW_CONFIDENCE_WORD_THRESHOLD && (
            <p className="rounded-[8px] border border-attention/40 bg-attention/10 p-2.5 text-xs text-attention">
              Ce texte fait moins de {LOW_CONFIDENCE_WORD_THRESHOLD} mots analysés : le résultat peut être moins fiable.
            </p>
          )}

          {/* Viewer a gauche (defilement continu) / resultats a droite, comme GPTZero */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <UploadedDocViewer file={scannedFile} text={result.text} spans={result.flagged_spans} />

            <div className="flex flex-col gap-4">
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
            </div>
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
        </div>
      </div>
    </ToolLayout>
  );
}
