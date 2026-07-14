"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Eye, Square, Wand2, Download, Plus, X, Loader2, Pencil, Send } from "lucide-react";
import { AIInteraction } from "@/components/tools/AIInteraction";
import { DocumentRenderer } from "@/components/tools/DocumentRenderer";
import { GenerationError } from "@/components/tools/GenerationError";
import { TemplateSelector, type TemplateOption } from "@/components/tools/TemplateSelector";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AnalyzeResponse,
  ChatTurn,
  ConversationTurn,
  DocEngineContext,
  DocType,
  PlanItem,
  WorkState,
} from "@/types/document-engine";
import type { InteractionBlock } from "@/types/interaction";

// Outils qui utilisent le fil de chat + panels redimensionnables plutot que
// l'ancien formulaire figé — CV/Lettre gardent l'ancien rendu pour l'instant.
const CHAT_STYLE_DOC_TYPES: DocType[] = ["academic", "pro_doc"];

export type CadrageField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  options?: { value: string; label: string }[];
};

function loadState(storageKey: string): Partial<WorkState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Partial<WorkState>) : null;
  } catch {
    return null;
  }
}

let turnCounter = 0;
function newTurnId(): string {
  turnCounter += 1;
  return `turn-${Date.now()}-${turnCounter}`;
}

function saveState(storageKey: string, state: WorkState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // stockage plein ou indisponible : on continue sans persister, jamais bloquant
  }
}

export type DocumentWorkspaceHandle = {
  mergeCadrage: (partial: Record<string, string>) => void;
  appendText: (text: string) => void;
};

export const DocumentWorkspace = forwardRef<DocumentWorkspaceHandle, {
  docType: DocType;
  storageKey: string;
  cadrageFields: CadrageField[];
  textareaLabel: string;
  textareaPlaceholder: string;
  templates: TemplateOption[];
  beforeCadrage?: React.ReactNode;
  connections?: React.ReactNode;
  initialState?: Partial<WorkState>;
  onStateChange?: (state: WorkState) => void;
  // Desactive le localStorage local au profit d'une persistance externe (initialState +
  // onStateChange) — utilise par l'academique, dont l'etat est deja persiste en base
  // (sessions longues, plusieurs jours) pour eviter tout conflit entre les deux sources.
  disableLocalStorage?: boolean;
}>(function DocumentWorkspace({
  docType,
  storageKey,
  cadrageFields,
  textareaLabel,
  textareaPlaceholder,
  templates,
  beforeCadrage,
  connections,
  initialState,
  onStateChange,
  disableLocalStorage,
}, ref) {
  const [restored] = useState<Partial<WorkState>>(() =>
    disableLocalStorage ? (initialState ?? {}) : (loadState(storageKey) ?? initialState ?? {}),
  );

  const [cadrage, setCadrage] = useState<Record<string, string>>(restored.cadrage ?? {});
  const [history, setHistory] = useState<ConversationTurn[]>(restored.history ?? []);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>(restored.chatTurns ?? []);
  const [validatedInfo, setValidatedInfo] = useState<Record<string, string>>(restored.validatedInfo ?? {});
  const [plan, setPlan] = useState<PlanItem[] | null>(restored.plan ?? null);
  const [documentId, setDocumentId] = useState<string | null>(restored.documentId ?? null);
  const [docTitle, setDocTitle] = useState<string | null>(restored.title ?? null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [userText, setUserText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const { blocks, isStreaming, error, isQuotaError, start, stop, setBlocks } = useBlockStream();
  const [adjustInstruction, setAdjustInstruction] = useState("");
  const [template, setTemplate] = useState(templates[0]?.value ?? "");
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // En dessous de lg, un split horizontal redimensionnable n'a pas de sens
  // (pas assez de largeur) — academic retombe sur l'empilement vertical simple.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (restored.blocks && restored.blocks.length > 0) setBlocks(restored.blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un changement de cadrage (type, domaine, competence, niveau de detail) alors
  // qu'un document existe deja rend ce document perime — on vide le panneau plutot
  // que de laisser un document qui ne correspond plus au cadrage affiche sans
  // signal. Un simple enrichissement (userText, reponse a une question/suggestion)
  // ne passe jamais par ici : seul un changement de cadrage le declenche.
  const prevCadrageRef = useRef(cadrage);
  useEffect(() => {
    const prev = prevCadrageRef.current;
    prevCadrageRef.current = cadrage;
    if (prev === cadrage) return;
    if (documentId && JSON.stringify(prev) !== JSON.stringify(cadrage)) {
      setBlocks([]);
      setDocumentId(null);
      setDocTitle(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadrage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatTurns, analyzing]);

  useImperativeHandle(ref, () => ({
    mergeCadrage: (partial) => setCadrage((prev) => ({ ...prev, ...partial })),
    appendText: (text) => setUserText((prev) => (prev.trim() ? `${prev}\n\n${text}` : text)),
  }));

  useEffect(() => {
    const state: WorkState = { cadrage, history, chatTurns, validatedInfo, plan, blocks, documentId, title: docTitle };
    if (!disableLocalStorage) saveState(storageKey, state);
    onStateChange?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadrage, history, chatTurns, validatedInfo, plan, blocks, documentId, docTitle]);

  function buildContext(extra?: Partial<DocEngineContext>): DocEngineContext {
    // "competence" et "depth" vivent dans le cadrage cote UI (memes selecteurs
    // compacts que type/domaine) mais sont des champs a part dans le contexte
    // envoye au backend — on les en extrait plutot que de les dupliquer dans le
    // JSON de cadrage transmis au LLM.
    const { competence, depth, ...restCadrage } = cadrage;
    return {
      cadrage: restCadrage,
      history,
      validated_info: validatedInfo,
      plan,
      user_message: userText,
      request_plan: false,
      competence: (competence as DocEngineContext["competence"]) || undefined,
      depth: (depth as DocEngineContext["depth"]) || undefined,
      ...extra,
    };
  }

  async function handleAnalyze(requestPlan = false) {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await apiFetch(`/api/v1/documents/${docType}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: buildContext({ request_plan: requestPlan }) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Analyse impossible.");
      const data: AnalyzeResponse = await res.json();
      setAnalysis(data);
      if (data.proposed_plan) setPlan(data.proposed_plan);
      const userTrimmed = userText.trim();
      setHistory((prev) => [
        ...prev,
        ...(userTrimmed ? [{ role: "user" as const, content: userTrimmed }] : []),
        { role: "assistant" as const, content: data.message },
      ]);
      setChatTurns((prev) => [
        ...prev,
        ...(userTrimmed ? [{ id: newTurnId(), role: "user" as const, content: userTrimmed }] : []),
        {
          id: newTurnId(),
          role: "assistant" as const,
          message: data.message,
          questions: data.questions.map((q) => ({ ...q, answer: undefined })),
          suggestions: data.suggestions.map((s) => ({ ...s, status: "pending" as const })),
        },
      ]);
      setUserText("");
    } catch (err) {
      setAnalyzeError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  // turnId scope la mise a jour a UN tour precis : deux tours differents peuvent
  // recevoir une question/suggestion numerotee "q1" par le LLM (les ids ne sont
  // uniques que dans la reponse d'un seul appel), sans turnId on risquerait de
  // resoudre la mauvaise question dans un tour anterieur portant le meme id.
  function answerQuestion(questionId: string, questionText: string, answer: string, turnId?: string) {
    if (answer.trim()) {
      setValidatedInfo((prev) => ({ ...prev, [questionText]: answer.trim() }));
      setHistory((prev) => [...prev, { role: "user", content: `${questionText} ${answer.trim()}` }]);
    }
    setAnalysis((prev) => (prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) } : prev));
    setChatTurns((prev) =>
      prev.map((t) =>
        t.role === "assistant" && (!turnId || t.id === turnId)
          ? { ...t, questions: t.questions.map((q) => (q.id === questionId ? { ...q, answer: answer.trim() || "(passé)" } : q)) }
          : t,
      ),
    );
  }

  function acceptSuggestion(id: string, label: string, value: string, target?: string, turnId?: string) {
    setValidatedInfo((prev) => ({ ...prev, [target || label]: value }));
    setHistory((prev) => [...prev, { role: "user", content: `J'accepte la suggestion « ${label} » : ${value}` }]);
    setAnalysis((prev) => (prev ? { ...prev, suggestions: prev.suggestions.filter((s) => s.id !== id) } : prev));
    setChatTurns((prev) =>
      prev.map((t) =>
        t.role === "assistant" && (!turnId || t.id === turnId)
          ? {
              ...t,
              suggestions: t.suggestions.map((s) => (s.id === id ? { ...s, value, status: "accepted" as const } : s)),
            }
          : t,
      ),
    );
  }

  function rejectSuggestion(id: string, turnId?: string) {
    setAnalysis((prev) => (prev ? { ...prev, suggestions: prev.suggestions.filter((s) => s.id !== id) } : prev));
    setChatTurns((prev) =>
      prev.map((t) =>
        t.role === "assistant" && (!turnId || t.id === turnId)
          ? { ...t, suggestions: t.suggestions.map((s) => (s.id === id ? { ...s, status: "rejected" as const } : s)) }
          : t,
      ),
    );
  }

  async function handleGenerate(instruction?: string) {
    setDocumentId(null);
    await start(
      `/api/v1/documents/${docType}/generate`,
      { context: buildContext({ adjust_instruction: instruction }) },
      (done) => {
        setDocumentId(done.document_id);
        setDocTitle(done.title);
        if (instruction) setAdjustInstruction("");
      },
    );
  }

  async function handleDownload() {
    if (!documentId) return;
    setDownloading(true);
    try {
      const res = await apiFetch(`/api/v1/documents/${documentId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, format, title: docTitle || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Téléchargement impossible.");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error("Téléchargement impossible", { description: (err as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  function turnBlocks(turn: Extract<ChatTurn, { role: "assistant" }>): InteractionBlock[] {
    const result: InteractionBlock[] = [];
    for (const s of turn.suggestions) {
      result.push({
        type: "suggestion",
        id: s.id,
        label: s.label,
        value: s.value,
        status: s.status,
        onAccept: () => acceptSuggestion(s.id, s.label, s.value, s.target, turn.id),
        onReject: () => rejectSuggestion(s.id, turn.id),
        onEdit: (v) => acceptSuggestion(s.id, s.label, v, s.target, turn.id),
      });
    }
    for (const q of turn.questions) {
      result.push({
        type: "question",
        id: q.id,
        question: q.text,
        optional: q.optional,
        answer: q.answer,
        onAnswer: (a) => answerQuestion(q.id, q.text, a, turn.id),
      });
    }
    return result;
  }

  const dialogueBlocks: InteractionBlock[] = [];
  if (analysis) {
    if (analysis.message) {
      dialogueBlocks.push({ type: "info", id: "message", variant: "info", text: analysis.message });
    }
    for (const s of analysis.suggestions) {
      dialogueBlocks.push({
        type: "suggestion",
        id: s.id,
        label: s.label,
        value: s.value,
        status: "pending",
        onAccept: () => acceptSuggestion(s.id, s.label, s.value, s.target),
        onReject: () => rejectSuggestion(s.id),
        onEdit: (v) => acceptSuggestion(s.id, s.label, v, s.target),
      });
    }
    for (const q of analysis.questions) {
      dialogueBlocks.push({
        type: "question",
        id: q.id,
        question: q.text,
        optional: q.optional,
        onAnswer: (a) => answerQuestion(q.id, q.text, a),
      });
    }
  }

  const planBlock = plan && (
    <div className="flex flex-col gap-2 rounded-[12px] border bg-card p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">Plan proposé</p>
      {plan.map((item, i) => (
        <div key={i} className="flex flex-col gap-1 rounded-[8px] border p-2.5">
          <div className="flex items-center gap-2">
            <Input
              value={item.heading}
              onChange={(e) =>
                setPlan((prev) => (prev ?? []).map((p, j) => (j === i ? { ...p, heading: e.target.value } : p)))
              }
              className="h-8 flex-1 text-sm font-medium"
            />
            <button
              type="button"
              onClick={() => setPlan((prev) => (prev ?? []).filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-erreur"
            >
              <X className="size-4" />
            </button>
          </div>
          <Textarea
            value={item.summary}
            onChange={(e) =>
              setPlan((prev) => (prev ?? []).map((p, j) => (j === i ? { ...p, summary: e.target.value } : p)))
            }
            className="min-h-12 text-xs"
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPlan((prev) => [...(prev ?? []), { heading: "Nouvelle section", summary: "" }])}
        >
          <Plus className="size-3.5" />
          Ajouter une section
        </Button>
        <Button size="sm" onClick={() => handleGenerate()} disabled={isStreaming}>
          Générer à partir de ce plan
        </Button>
      </div>
    </div>
  );

  const resultPanel = (
    <div
      className={cn(
        "flex flex-col gap-4",
        !CHAT_STYLE_DOC_TYPES.includes(docType) && "lg:sticky lg:top-6 lg:self-start",
      )}
    >
      {editingTitle ? (
        <Input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => {
            setDocTitle(titleDraft.trim() || docTitle);
            setEditingTitle(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          className="h-9 text-base font-semibold"
        />
      ) : docTitle ? (
        <button
          type="button"
          onClick={() => {
            setTitleDraft(docTitle);
            setEditingTitle(true);
          }}
          className="group flex w-fit items-center gap-1.5 text-left"
          title="Cliquer pour modifier le titre"
        >
          <h3>{docTitle}</h3>
          <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      ) : (
        <h3>Résultat</h3>
      )}
      {!isStreaming && blocks.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-[12px] border border-dashed p-8 text-center text-sm text-muted-foreground">
          Votre document apparaîtra ici.
        </div>
      ) : (
        <DocumentRenderer blocks={blocks} template={template} />
      )}
      {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={() => handleGenerate()} />}

      {documentId && !isStreaming && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={adjustInstruction}
              onChange={(e) => setAdjustInstruction(e.target.value)}
              placeholder="Ajuster : « Raccourcis le résumé »..."
              className="max-w-sm text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(adjustInstruction)}
              disabled={!adjustInstruction.trim() || isStreaming}
            >
              <Wand2 className="size-3.5" />
              Ajuster
            </Button>
          </div>

          {templates.length > 0 && (
            <>
              <Label>Modèle</Label>
              <TemplateSelector options={templates} value={template} onChange={setTemplate} />
            </>
          )}
          <div className="flex items-center gap-3">
            <FormatSelector value={format} onChange={setFormat} />
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className="size-4" />
              {downloading ? "Préparation..." : "Télécharger"}
            </Button>
          </div>

          {connections}
        </div>
      )}
    </div>
  );

  if (CHAT_STYLE_DOC_TYPES.includes(docType)) {
    const leftPanel = (
      <div className="flex flex-col gap-3">
        {beforeCadrage}
        {cadrageFields.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cadrageFields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                {f.options ? (
                  <Select
                    value={cadrage[f.key] ?? f.options[0]?.value ?? ""}
                    onValueChange={(v) => v && setCadrage((prev) => ({ ...prev, [f.key]: v }))}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    value={cadrage[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setCadrage((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fil de chat — s'empile, rien n'est jamais effacé */}
        <div className="flex flex-col gap-3 rounded-[12px] border bg-card p-4">
          {chatTurns.length === 0 && !analyzing && (
            <p className="text-sm italic text-muted-foreground">
              Décrivez votre sujet ci-dessous pour commencer — l&apos;IA vous guidera.
            </p>
          )}
          {chatTurns.map((turn) =>
            turn.role === "user" ? (
              <div key={turn.id} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[12px] rounded-tr-sm bg-bleu-boulga px-3 py-2 text-sm text-white">
                  {turn.content}
                </div>
              </div>
            ) : (
              <div key={turn.id} className="flex flex-col gap-2">
                {turn.message && (
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-[12px] rounded-tl-sm bg-muted px-3 py-2 text-sm">
                    {turn.message}
                  </div>
                )}
                {turnBlocks(turn).length > 0 && (
                  <div className="max-w-[90%]">
                    <AIInteraction blocks={turnBlocks(turn)} />
                  </div>
                )}
              </div>
            ),
          )}
          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              L&apos;IA réfléchit...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {analyzeError && <GenerationError message={analyzeError} onRetry={() => handleAnalyze(false)} />}

        {planBlock}

        {/* Composeur façon chat + actions persistantes */}
        <div className="sticky bottom-4 flex flex-col gap-2 rounded-[12px] border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleGenerate()} disabled={isStreaming}>
              {isStreaming ? "Génération en cours..." : "Générer le document"}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stop}>
                <Square className="size-4" />
                Arrêter
              </Button>
            )}
            {analysis?.can_propose_plan && !plan && (
              <button
                type="button"
                onClick={() => handleAnalyze(true)}
                disabled={analyzing}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-bleu-boulga hover:underline"
              >
                <Eye className="size-3.5" />
                Voir le plan
              </button>
            )}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (userText.trim() && !analyzing) handleAnalyze(false);
                }
              }}
              placeholder={textareaPlaceholder}
              className="max-h-40 min-h-10 flex-1 resize-none"
            />
            <Button
              size="icon"
              onClick={() => handleAnalyze(false)}
              disabled={analyzing || !userText.trim()}
              title="Envoyer"
            >
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    );

    // Sous lg, un split horizontal redimensionnable n'a pas de sens (pas assez
    // de largeur) — empilement vertical simple, comme avant.
    if (!isDesktop) {
      return (
        <div className="flex flex-col gap-6">
          {leftPanel}
          {resultPanel}
        </div>
      );
    }

    return (
      <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
        <ResizablePanel defaultSize={58} minSize={35} maxSize={75} className="overflow-y-auto">
          <div className="pr-4">{leftPanel}</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={42} minSize={25} maxSize={65} className="overflow-y-auto">
          <div className="pl-4">{resultPanel}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        {beforeCadrage}
        {cadrageFields.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cadrageFields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label>{f.label}</Label>
                {f.options ? (
                  <Select
                    value={cadrage[f.key] ?? f.options[0]?.value ?? ""}
                    onValueChange={(v) => v && setCadrage((prev) => ({ ...prev, [f.key]: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    value={cadrage[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setCadrage((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>{textareaLabel}</Label>
          <Textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder={textareaPlaceholder}
            className="min-h-40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => handleAnalyze(false)} disabled={analyzing}>
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {analyzing ? "Analyse en cours..." : "Analyser mes informations"}
          </Button>
          <Button onClick={() => handleGenerate()} disabled={isStreaming}>
            {isStreaming ? "Génération en cours..." : "Générer le document"}
          </Button>
          {isStreaming && (
            <Button variant="outline" onClick={stop}>
              <Square className="size-4" />
              Arrêter
            </Button>
          )}
          {analysis?.can_propose_plan && !plan && (
            <button
              type="button"
              onClick={() => handleAnalyze(true)}
              disabled={analyzing}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-bleu-boulga hover:underline"
            >
              <Eye className="size-3.5" />
              Voir le plan
            </button>
          )}
        </div>
        {analyzeError && <GenerationError message={analyzeError} onRetry={() => handleAnalyze(false)} />}

        <AIInteraction blocks={dialogueBlocks} loading={analyzing} loadingLabel="L'IA réfléchit..." />

        {planBlock}
      </div>
      {resultPanel}
    </div>
  );
});
