"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScanSearch, Loader2, Square, Clock, Upload, FileText, Plus } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { ScoreGauge } from "@/components/tools/ScoreGauge";
import { HighlightedText } from "@/components/tools/HighlightedText";
import { UploadedDocViewer } from "@/components/tools/UploadedDocViewer";
import { PageScoreList } from "@/components/tools/PageScoreList";
import { CopyButton } from "@/components/tools/CopyButton";
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

const TONES = [
  { value: "convivial", label: "Convivial" },
  { value: "academique", label: "Académique" },
  { value: "professionnel", label: "Professionnel" },
  { value: "neutre", label: "Neutre" },
  { value: "persuasif", label: "Persuasif" },
  { value: "formel", label: "Formel / Soutenu" },
];

// Textes temoins pour tester l'outil sans coller son propre contenu (comme les
// exemples cliquables de GPTZero) — un cas net de chaque categorie.
const EXAMPLES = [
  {
    label: "Exemple généré par IA",
    text: "Il est important de noter que la gestion efficace du temps constitue un pilier fondamental de la réussite professionnelle. En effet, une bonne organisation permet non seulement d'optimiser la productivité, mais également de réduire le stress au quotidien. De plus, il convient de souligner que chaque individu doit développer ses propres stratégies afin de mieux structurer ses priorités. Par ailleurs, l'utilisation d'outils numériques adaptés peut grandement faciliter ce processus et favoriser un meilleur équilibre entre vie professionnelle et vie personnelle.",
  },
  {
    label: "Exemple humain",
    text: "Bon alors hier j'ai encore raté le bus de 8h12, comme d'hab, et j'ai dû courir jusqu'à l'arrêt suivant avec mon café qui débordait partout sur ma manche. Franchement je sais même pas pourquoi je continue à prendre ce bus, celui d'après passe presque à la même heure et j'ai jamais à courir. Enfin bref, arrivée en retard, mon chef a rien dit heureusement, il était encore en réunion.",
  },
  {
    label: "Exemple mixte (humain + IA)",
    text: "Je me souviens encore de ce jour où on a failli rater l'avion pour Dakar, ma valise coincée dans le tourniquet et ma mère qui criait mon nom à l'autre bout de l'aéroport. Il est essentiel de souligner que ces moments de stress, bien que difficiles sur le coup, deviennent souvent des souvenirs précieux avec le recul. On a fini par courir tous les deux, morts de rire, et on est arrivés à la porte d'embarquement trente secondes avant la fermeture.",
  },
];

type PageScore = { page: number; ai_score: number | null; too_short: boolean };

type ScanResult = {
  text: string;
  ai_score: number;
  mixed_score: number;
  human_score: number;
  flagged_spans: { start: number; end: number }[];
  page_scores: PageScore[];
  pages_analyzed: number;
  total_pages: number;
  pages_exact: boolean;
};

type HistoryItem = { id: string; title: string; created_at: string };
type Mode = "text" | "file";

export default function AiDetectorPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  // Fichier reellement analyse par le dernier scan reussi — distinct de `file` (la
  // selection courante), qui peut changer avant qu'on relance une analyse (cf.
  // indicateur "texte modifie"). Evite d'afficher le rendu natif d'un fichier qui ne
  // correspond plus au resultat affiche.
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [lastScanKey, setLastScanKey] = useState<string | null>(null);
  const [tone, setTone] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { text: rewritten, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const canRewrite = profile ? profile.current_tier !== "introduction" : false;

  useEffect(() => {
    apiFetch("/api/v1/tools/analyzers/ai-detector/history").then((res) => {
      if (res.ok) res.json().then(setHistory);
    });
  }, []);

  async function refreshHistory() {
    const res = await apiFetch("/api/v1/tools/analyzers/ai-detector/history");
    if (res.ok) setHistory(await res.json());
  }

  // Reinitialise tout et repart en mode texte — equivalent du bouton "+" de GPTZero.
  function resetAll() {
    setMode("text");
    setText("");
    setFile(null);
    setResult(null);
    setScannedFile(null);
    setLastScanKey(null);
  }

  // Seuls les scans de FICHIER sont conserves (l'historique ne renvoie que ceux-la,
  // cote backend) — rouvrir un item bascule en mode fichier et ne touche jamais `text`,
  // pour ne pas dupliquer le contenu entre la zone de saisie et le viewer.
  async function openHistoryItem(id: string) {
    const res = await apiFetch(`/api/v1/tools/analyzers/ai-detector/history/${id}`);
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
      setResult({ text: "", ...scanResult });

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

  async function handleScan() {
    if (mode === "text" ? !text.trim() : !file) return;
    setScanning(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (mode === "file" && file) formData.append("file", file);
      else formData.append("text", text);

      const res = await apiFetch("/api/v1/tools/analyzers/ai-detector/scan", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Échec de l'analyse.");
      }
      setLastScanKey(computeScanKey());
      setScannedFile(mode === "file" ? file : null);
      setResult(await res.json());
      if (mode === "file") refreshHistory();
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
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
        <div className="order-2 flex flex-col gap-2 lg:order-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            Historique
          </p>
          <p className="text-xs text-muted-foreground">Fichiers analysés uniquement.</p>
          <div className="flex flex-col gap-1">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun fichier analysé pour le moment.</p>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {mode === "text" ? "Texte collé — non conservé" : "Fichier — conservé dans l'historique"}
              </p>
              {(text.trim() || file || result) && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-1 text-xs font-medium text-bleu-boulga hover:underline"
                >
                  <Plus className="size-3.5" />
                  Nouvelle analyse
                </button>
              )}
            </div>

            {mode === "text" ? (
              <>
                <RichTextEditor
                  value={text}
                  onChange={setText}
                  placeholder="Collez le texte à analyser..."
                  className="min-h-32"
                />
                <button
                  type="button"
                  onClick={() => setMode("file")}
                  className="flex w-fit items-center gap-1.5 text-xs font-medium text-bleu-boulga hover:underline"
                >
                  <Upload className="size-3.5" />
                  Importer un fichier à la place
                </button>

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
              <>
                {file ? (
                  <div className="flex items-center gap-2 rounded-[8px] border bg-card p-3 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
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
                <button
                  type="button"
                  onClick={() => {
                    setMode("text");
                    setFile(null);
                  }}
                  className="flex w-fit items-center gap-1.5 text-xs font-medium text-bleu-boulga hover:underline"
                >
                  Coller du texte à la place
                </button>
              </>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleScan}
                disabled={scanning || (mode === "text" ? !text.trim() : !file)}
                className="w-fit"
              >
                {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
                {scanning ? "Analyse en cours..." : "Analyser"}
              </Button>
              {result && !scanning && (
                <span className={isStale ? "text-xs font-medium text-attention" : "text-xs text-muted-foreground"}>
                  {isStale ? "Contenu modifié — relancez l'analyse pour un résultat à jour" : "Résultat à jour"}
                </span>
              )}
            </div>
          </div>

          {result && (
            <div className="flex flex-col gap-4 border-t pt-6">
              {mode === "file" ? (
                // Viewer a gauche (defilement continu) / resultats a droite, comme GPTZero
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                  <UploadedDocViewer file={scannedFile} text={result.text} spans={result.flagged_spans} />

                  <div className="flex flex-col gap-4">
                    <ScoreGauge
                      aiScore={result.ai_score}
                      mixedScore={result.mixed_score}
                      humanScore={result.human_score}
                    />
                    {result.total_pages > 1 && (
                      <PageScoreList
                        pageScores={result.page_scores}
                        pagesAnalyzed={result.pages_analyzed}
                        totalPages={result.total_pages}
                        pagesExact={result.pages_exact}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <ScoreGauge
                    aiScore={result.ai_score}
                    mixedScore={result.mixed_score}
                    humanScore={result.human_score}
                  />
                  <div className="rounded-[12px] border bg-card p-4 text-sm">
                    <HighlightedText text={result.text} spans={result.flagged_spans} />
                  </div>
                </div>
              )}

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
        </div>
      </div>
    </ToolLayout>
  );
}
