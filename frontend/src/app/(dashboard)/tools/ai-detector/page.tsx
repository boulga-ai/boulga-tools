// frontend/src/app/%28dashboard%29/tools/ai-detector/page.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ScanSearch,
  Loader2,
  Square,
  History,
  Plus,
  Download,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { ScoreGauge } from "@/components/tools/ScoreGauge";
import { HighlightedText } from "@/components/tools/HighlightedText";
import { UploadedDocViewer } from "@/components/tools/UploadedDocViewer";
import { PageScoreList } from "@/components/tools/PageScoreList";
import { AiSentenceList } from "@/components/tools/AiSentenceList";
import { AiVocabularyList } from "@/components/tools/AiVocabularyList";
import { ScoreRing } from "@/components/tools/ScoreRing";
import { HistoryList, type HistoryItem } from "@/components/tools/HistoryList";
import { FeedbackButtons } from "@/components/tools/FeedbackButtons";
import { ModeToggle } from "@/components/tools/ModeToggle";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { RichTextEditor } from "@/components/tools/RichTextEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { highlightTier } from "@/lib/highlightTier";
import { downloadTextReport } from "@/lib/export";

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
  flagged_spans: { start: number; end: number; ai_score: number; reason?: string }[];
  page_scores: PageScore[];
  page_ranges: [number, number][];
  ai_vocabulary: string[];
  pages_analyzed: number;
  total_pages: number;
  pages_exact: boolean;
  conversation_id: string | null;
};

type Mode = "text" | "file";

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function AiDetectorPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [editingText, setEditingText] = useState(true);
  // Vue simple par defaut (score global + quelques details), comme le "Basic Scan" de
  // GPTZero — le detail page par page est disponible a la demande, pas impose d'emblee.
  const [showPageDetails, setShowPageDetails] = useState(false);
  // Meme logique "a la demande" que le detail page par page, pour la liste des phrases
  // signalees (equivalent de l'onglet "AI Sentences" de GPTZero).
  const [showSentences, setShowSentences] = useState(false);
  // Modale de depot de fichier (barre superieure du viewer) et tiroir d'historique
  // (barre superieure aussi) — remplacent la colonne fixe et la dropzone pleine largeur
  // d'avant, pattern GPTZero : le document domine, tout le reste est a la demande.
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
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
    setEditingText(true);
    setScannedFile(null);
    setLastScanKey(null);
    setShowPageDetails(false);
    setShowSentences(false);
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
      setEditingText(false);
      if (mode === "file") refreshHistory();
    } catch (err) {
      toast.error("Analyse impossible", { description: (err as Error).message });
    } finally {
      setScanning(false);
    }
  }

  // Fait defiler le viewer jusqu'a la premiere occurrence d'un marqueur de vocabulaire
  // IA (voir AiVocabularyList) — retrouve la page qui contient cette occurrence via
  // page_ranges (chaque page du viewer porte un id "doc-page-N", voir
  // UploadedDocViewer) plutot que de cibler un noeud de texte precis dans le DOM.
  function scrollToVocabTerm(term: string) {
    if (!result) return;
    const idx = result.text.indexOf(term);
    if (idx === -1) return;
    const pageIdx = result.page_ranges.findIndex(([start, end]) => idx >= start && idx < end);
    const anchorId = pageIdx >= 0 ? `doc-page-${pageIdx + 1}` : "doc-page-1";
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleExport() {
    if (!result) return;
    const flagged = result.flagged_spans.filter((s) => highlightTier(s.ai_score) !== null);
    const lines = [
      "Détecteur de contenu IA — Boulga AI",
      `Score IA : ${result.ai_score}% — Mixte : ${result.mixed_score}% — Humain : ${result.human_score}%`,
      "",
      "Passages signalés :",
      ...(flagged.length === 0
        ? ["(aucun)"]
        : flagged.map((s) => `- (${s.ai_score}% IA) "${result.text.slice(s.start, s.end)}"`)),
      "",
      "Texte analysé :",
      result.text,
    ];
    downloadTextReport("detecteur-ia-boulga.txt", lines);
  }

  async function handleRewrite() {
    if (!result || !canRewrite) return;
    await start("/api/v1/tools/analyzers/ai-detector/rewrite", { text: result.text, tone });
  }

  // Texte affiche dans le compteur de la barre inferieure : celui du dernier resultat
  // une fois disponible (coherent avec ce qui est reellement analyse), sinon le texte en
  // cours de saisie en mode texte. En mode fichier avant scan, rien a compter (le texte
  // n'est extrait que cote backend).
  const counterText = result ? result.text : mode === "text" ? text : "";
  const showCounter = result !== null || (mode === "text" && text.trim().length > 0);

  return (
    <ToolLayout
      title="Détecteur de contenu IA"
      description="Estime la probabilité qu'un texte ait été généré par une IA."
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Score gratuit
        </span>
      }
      wide
    >
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Colonne gauche — viewer/editeur, dominant, façon GPTZero */}
        <div className="flex flex-col gap-3 rounded-[12px] border bg-card p-3">
          {/* Barre superieure */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ModeToggle
                mode={mode}
                onChange={(m) => {
                  setMode(m);
                  setFile(null);
                  setEditingText(true);
                }}
              />
              {mode === "file" &&
                (file ? (
                  <div className="flex items-center gap-1.5 rounded-[8px] border bg-background px-2.5 py-1.5 text-xs">
                    <span className="max-w-40 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-muted-foreground hover:text-erreur"
                      title="Retirer le fichier"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setUploadModalOpen(true)}>
                    <Upload className="size-3.5" />
                    Charger un fichier
                  </Button>
                ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-bleu-boulga"
              >
                <History className="size-3.5" />
                Historique
              </button>
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
          </div>

          {/* Zone principale */}
          <div className="flex min-h-[420px] flex-1 flex-col">
            {mode === "text" ? (
              showTextEditor ? (
                <div className="flex flex-1 flex-col gap-2">
                  <RichTextEditor
                    value={text}
                    onChange={setText}
                    placeholder="Collez le texte à analyser..."
                    className="min-h-[380px] flex-1"
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
                </div>
              ) : (
                result && (
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Texte analysé
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingText(true)}
                        className="text-xs font-medium text-bleu-boulga hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div
                      id="doc-page-1"
                      className="flex-1 overflow-y-auto rounded-lg border p-2.5 text-sm"
                    >
                      <HighlightedText
                        text={result.text}
                        spans={result.flagged_spans}
                        rewriteConfig={{ canRewrite }}
                      />
                    </div>
                  </div>
                )
              )
            ) : !file ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
                <FileText className="size-6" />
                Aucun fichier chargé.
                <Button variant="outline" size="sm" onClick={() => setUploadModalOpen(true)}>
                  <Upload className="size-3.5" />
                  Charger un fichier
                </Button>
              </div>
            ) : !result || isStale ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
                <FileText className="size-6" />
                <span className="font-medium text-foreground">{file.name}</span>
                <span>Cliquez sur « Analyser » pour lancer le scan.</span>
              </div>
            ) : (
              <UploadedDocViewer
                file={scannedFile}
                text={result.text}
                spans={result.flagged_spans}
                pageRanges={result.page_ranges}
                pageScores={result.page_scores}
                totalPages={result.total_pages}
                pagesExact={result.pages_exact}
                rewriteConfig={{ canRewrite }}
              />
            )}
          </div>

          {/* Barre inferieure */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <Button
              onClick={handleScan}
              disabled={scanning || (mode === "text" ? !text.trim() : !file)}
              className="w-fit"
            >
              {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              {scanning ? "Analyse en cours..." : "Analyser"}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {result && (
                <>
                  <span className={isStale ? "font-medium text-attention" : undefined}>
                    {isStale ? "Contenu modifié — relancez l'analyse" : "Résultat à jour"}
                  </span>
                  {showCounter && <span>·</span>}
                </>
              )}
              {showCounter && (
                <span>
                  {counterText.length.toLocaleString("fr-FR")} caractères •{" "}
                  {countWords(counterText).toLocaleString("fr-FR")} mots
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite — resultats et actions, compacte */}
        <div className="flex flex-col gap-4">
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Lancez une analyse pour voir les résultats.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <ScoreRing score={result.ai_score} label="IA" />
                <p className="text-sm text-muted-foreground">
                  {confidenceSentence(result.ai_score, "ce texte a été généré par IA")}
                </p>
              </div>
              <ScoreGauge
                aiScore={result.ai_score}
                mixedScore={result.mixed_score}
                humanScore={result.human_score}
              />

              <button
                type="button"
                onClick={() => setShowSentences((v) => !v)}
                className="flex w-fit items-center gap-1 text-xs font-medium text-bleu-boulga hover:underline"
              >
                {showSentences ? "Vue simple" : "Phrases signalées"}
              </button>
              {showSentences && <AiSentenceList text={result.text} spans={result.flagged_spans} />}

              <AiVocabularyList terms={result.ai_vocabulary} onSelect={scrollToVocabTerm} />

              {result.total_pages > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPageDetails((v) => !v)}
                    className="flex w-fit items-center gap-1 text-xs font-medium text-bleu-boulga hover:underline"
                  >
                    {showPageDetails ? "Vue simple" : "Détail page par page"}
                  </button>
                  {showPageDetails && (
                    <PageScoreList
                      pageScores={result.page_scores}
                      pagesAnalyzed={result.pages_analyzed}
                      totalPages={result.total_pages}
                      pagesExact={result.pages_exact}
                    />
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                {mode === "file" && result.conversation_id && (
                  <FeedbackButtons
                    endpoint="/api/v1/tools/analyzers/ai-detector/feedback"
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
                  <div className="flex flex-col gap-4">
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
            </>
          )}
        </div>
      </div>

      {/* Modale de depot de fichier */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Charger un fichier</DialogTitle>
          </DialogHeader>
          <DropZone
            onFiles={(files) => {
              setFile(files[0]);
              setUploadModalOpen(false);
            }}
            accept=".pdf,.docx,.txt"
            label="Glissez-déposez un PDF, DOCX ou TXT, ou"
          />
        </DialogContent>
      </Dialog>

      {/* Tiroir d'historique */}
      <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Historique</SheetTitle>
            <SheetDescription>Fichiers analysés uniquement.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <HistoryList
              items={history}
              onSelect={(id) => {
                openHistoryItem(id);
                setHistoryDrawerOpen(false);
              }}
              emptyLabel="Aucun fichier analysé pour le moment."
              scoreLabel="IA"
            />
          </div>
        </SheetContent>
      </Sheet>
    </ToolLayout>
  );
}
