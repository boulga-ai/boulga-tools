"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Loader2, ExternalLink, Square, Clock, Plus, Download } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { MarkdownContent } from "@/components/tools/MarkdownContent";
import { RichTextEditor } from "@/components/tools/RichTextEditor";
import { UploadedDocViewer } from "@/components/tools/UploadedDocViewer";
import { HighlightedText } from "@/components/tools/HighlightedText";
import { HistoryList, type HistoryItem } from "@/components/tools/HistoryList";
import { FeedbackButtons } from "@/components/tools/FeedbackButtons";
import { ModeToggle } from "@/components/tools/ModeToggle";
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
import { confidenceSentence } from "@/lib/confidence";
import { downloadTextReport } from "@/lib/export";

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
  conversation_id: string | null;
};

type Mode = "text" | "file";

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function PlagiarismPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [editingText, setEditingText] = useState(true);
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

  // Reinitialise tout et repart en mode texte — equivalent du bouton "+" de GPTZero.
  function resetAll() {
    setMode("text");
    setText("");
    setFile(null);
    setResult(null);
    setEditingText(true);
    setScannedFile(null);
    setLastScanKey(null);
  }

  // Seuls les scans de FICHIER sont conserves (l'historique ne renvoie que ceux-la,
  // cote backend) — rouvrir un item bascule en mode fichier et ne touche jamais `text`,
  // pour ne pas dupliquer le contenu entre la zone de saisie et le viewer.
  async function openHistoryItem(id: string) {
    const res = await apiFetch(`/api/v1/tools/analyzers/plagiarism/history/${id}`);
    if (!res.ok) return;
    const conversation = await res.json();
    const messages = (conversation.messages_json ?? []) as { role: string; content: string }[];
    const assistantMessage = messages.find((m) => m.role === "assistant");
    if (!assistantMessage) return;
    try {
      const { file_url: fileUrl, file_name: fileName, ...scanResult } = JSON.parse(
        assistantMessage.content,
      );
      setMode("file");
      setText("");
      setFile(null);
      setResult({ text: "", conversation_id: conversation.id, ...scanResult });

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
    return mode === "file" && file ? `file:${file.name}:${file.size}` : `text:${text}`;
  }
  const isStale = result !== null && lastScanKey !== null && computeScanKey() !== lastScanKey;
  // Mode texte : un seul affichage a la fois — editeur tant qu'il n'y a pas de resultat
  // frais, texte surligne en lecture seule sinon (jamais les deux empiles).
  const showTextEditor = mode === "text" && (editingText || !result || isStale);

  async function handleScan() {
    if (mode === "text" ? !text.trim() : !file) return;
    setSubmitting(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (mode === "file" && file) formData.append("file", file);
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
      setScannedFile(mode === "file" ? file : null);
      setResult(await res.json());
      setEditingText(false);
      if (mode === "file") refreshHistory();
    } catch (err) {
      toast.error("Vérification impossible", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleExport() {
    if (!result) return;
    const lines = [
      "Vérificateur de plagiat — Boulga AI",
      `Score de similarité : ${result.similarity_score}%`,
      "",
      "Passages signalés :",
      ...(result.flagged_spans.length === 0
        ? ["(aucun)"]
        : result.flagged_spans.map((s) => `- "${s.text}" (${s.similarity}% — ${s.source_url})`)),
      "",
      "Texte analysé :",
      result.text,
    ];
    downloadTextReport("verificateur-plagiat-boulga.txt", lines);
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
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
        <div className="order-2 flex flex-col gap-2 lg:order-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            Historique
          </p>
          <p className="text-xs text-muted-foreground">Fichiers vérifiés uniquement.</p>
          <HistoryList
            items={history}
            onSelect={openHistoryItem}
            emptyLabel="Aucun fichier vérifié pour le moment."
            scoreLabel="Plagiat"
          />
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ModeToggle
                mode={mode}
                onChange={(m) => {
                  setMode(m);
                  setFile(null);
                  setEditingText(true);
                }}
              />
              {(text.trim() || file || result) && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-1 text-xs font-medium text-bleu-boulga hover:underline"
                >
                  <Plus className="size-3.5" />
                  Nouvelle vérification
                </button>
              )}
            </div>

            {mode === "text" ? (
              showTextEditor ? (
                <>
                  <RichTextEditor
                    value={text}
                    onChange={setText}
                    placeholder="Collez le texte à vérifier..."
                    className="min-h-32"
                  />
                  {!text.trim() && (
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
                </>
              ) : (
                result && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Texte vérifié
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingText(true)}
                        className="text-xs font-medium text-bleu-boulga hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div className="min-h-32 rounded-lg border p-2.5 text-sm">
                      <HighlightedText text={result.text} spans={result.flagged_spans} />
                    </div>
                  </div>
                )
              )
            ) : (
              <>
                {file ? (
                  <div className="flex items-center gap-2 rounded-[8px] border bg-card p-3 text-sm">
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-muted-foreground hover:text-erreur"
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <DropZone
                    onFiles={(files) => setFile(files[0])}
                    accept=".pdf,.docx,.txt"
                    label="Glissez-déposez un PDF, DOCX ou TXT, ou"
                  />
                )}
              </>
            )}

            <Button
              onClick={handleScan}
              disabled={submitting || (mode === "text" ? !text.trim() : !file)}
              className="w-fit"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
              {submitting ? "Analyse en cours..." : "Vérifier le plagiat"}
            </Button>
          </div>

          {result && (
            <div className="flex flex-col gap-4 border-t pt-6">
              {result.sample_word_count < LOW_CONFIDENCE_WORD_THRESHOLD && (
                <p className="rounded-[8px] border border-attention/40 bg-attention/10 p-2.5 text-xs text-attention">
                  Ce texte fait moins de {LOW_CONFIDENCE_WORD_THRESHOLD} mots analysés : le résultat peut être moins fiable.
                </p>
              )}

              {mode === "file" ? (
                // Viewer a gauche (defilement continu) / resultats a droite, comme GPTZero
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                  <UploadedDocViewer file={scannedFile} text={result.text} spans={result.flagged_spans} />

                  <ResultSummary result={result} />
                </div>
              ) : (
                <ResultSummary result={result} />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <div className="flex items-center gap-3">
                  {mode === "file" && result.conversation_id && (
                    <FeedbackButtons
                      endpoint="/api/v1/tools/analyzers/plagiarism/feedback"
                      conversationId={result.conversation_id}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-bleu-boulga"
                  >
                    <Download className="size-3.5" />
                    Exporter
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={isStale ? "font-medium text-attention" : undefined}>
                    {isStale ? "Contenu modifié — relancez l'analyse" : "Résultat à jour"}
                  </span>
                  <span>·</span>
                  <span>
                    {result.text.length.toLocaleString("fr-FR")} caractères •{" "}
                    {countWords(result.text).toLocaleString("fr-FR")} mots
                  </span>
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

function ResultSummary({ result }: { result: ScanResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-2xl font-semibold text-erreur">{result.similarity_score}%</p>
        <p className="text-sm text-muted-foreground">de contenu potentiellement similaire</p>
      </div>

      <p className="text-sm text-muted-foreground">
        {confidenceSentence(result.similarity_score, "ce texte contient du contenu plagié")}
      </p>

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
  );
}
