"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  Square,
  Wand2,
  Download,
  Plus,
  X,
  Loader2,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { AIInteraction } from "@/components/tools/AIInteraction";
import { ChatInput } from "@/components/tools/ChatInput";
import { MarkdownContent } from "@/components/tools/MarkdownContent";
import { DocumentRenderer } from "@/components/tools/DocumentRenderer";
import { GenerationError } from "@/components/tools/GenerationError";
import { PageResultCard } from "@/components/tools/PageResultCard";
import { TemplateSelector, type TemplateOption } from "@/components/tools/TemplateSelector";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import type {
  AnalyzeResponse,
  ChatTurn,
  ConversationTurn,
  DocEngineContext,
  DocType,
  PlanItem,
  ProjectSnapshot,
  ResultItem,
  WorkState,
} from "@/types/document-engine";
import type { InteractionBlock } from "@/types/interaction";

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

// Nom par defaut d'un projet fraichement cree (voir handleNewDocument) — sert aussi
// a detecter si le user l'a deja renomme (auto-nommage desactive des qu'il ne
// correspond plus a ce format, voir handleGenerate).
const DEFAULT_PROJECT_NAME_RE = /^Projet \d+$/;

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

// Projets archives (voir handleNewDocument/openProject) : cle localStorage distincte
// du WorkState du projet actif, pour ne jamais melanger "en cours" et "historique".
function loadArchivedProjects(storageKey: string): ProjectSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${storageKey}:projects`);
    return raw ? (JSON.parse(raw) as ProjectSnapshot[]) : [];
  } catch {
    return [];
  }
}

function saveArchivedProjects(storageKey: string, projects: ProjectSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${storageKey}:projects`, JSON.stringify(projects));
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
  // cv/cover_letter : le template choisi conditionne ce que le LLM produit (pas
  // seulement l'habillage) — voir backend blocks.TEMPLATE_OVERRIDES. Change alors le
  // moment ou le selecteur de template apparait (des le debut, pas seulement apres
  // generation) et invalide le document existant si le template change en cours de
  // route. pro_doc/academic laissent ce prop a false (defaut) : leur template reste un
  // habillage pur, jamais rappele au LLM.
  templateConditionsContent?: boolean;
  // pro_doc/academic : le template reste un habillage pur (jamais de contrat de
  // contenu, contrairement a templateConditionsContent) mais doit quand meme se
  // choisir AVANT generation, comme cv/cover_letter — uniquement pour deplacer le
  // selecteur dans leftPanel plutot que resultPanel. Ne declenche jamais
  // l'invalidation du document existant (voir l'effet cible sur templateConditionsContent
  // seul, plus bas) : changer de skin pur ne perime jamais un document deja genere.
  templateUpfront?: boolean;
  // cv/cover_letter : plusieurs documents generes coexistent dans le meme projet
  // (fil de cartes, comme Reseaux sociaux/Convertisseur) au lieu d'un document
  // unique ecrase a chaque generation. newDocumentLabel affiche un bouton qui vide
  // le contexte de travail (cadrage/historique/infos validees) pour changer de
  // sujet SANS perdre les documents deja generes — eux persistent independamment.
  multiResult?: boolean;
  newDocumentLabel?: string;
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
  templateConditionsContent = false,
  templateUpfront = false,
  multiResult = false,
  newDocumentLabel,
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

  // Projets nommes (multiResult uniquement) : "Nouveau CV"/"Nouvelle lettre" archive
  // le projet actif (jamais supprime) et en ouvre un nouveau vierge — voir
  // handleNewDocument/openProject. Le compteur ne redescend jamais, meme si des
  // projets sont rouverts/refermes, pour ne jamais reutiliser un nom par defaut.
  const projectCounterRef = useRef(1);
  const [projectId, setProjectId] = useState<string>(() => restored.projectId ?? crypto.randomUUID());
  const [projectName, setProjectName] = useState<string>(() => restored.projectName ?? "Projet 1");
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [archivedProjects, setArchivedProjects] = useState<ProjectSnapshot[]>(() =>
    multiResult ? loadArchivedProjects(storageKey) : [],
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  const [userText, setUserText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const { blocks, isStreaming, error, isQuotaError, start, stop, setBlocks } = useBlockStream();
  const [template, setTemplate] = useState(templates[0]?.value ?? "");
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [results, setResults] = useState<ResultItem[]>(restored.results ?? []);
  const hasGenerated = multiResult ? results.length > 0 : !!documentId;
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
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

  // Meme logique que ci-dessus, pour le template — mais seulement quand il conditionne
  // le contenu (cv/cover_letter) : pour pro_doc/academic le template reste un habillage
  // pur, le changer ne doit jamais invalider le document deja genere.
  const prevTemplateRef = useRef(template);
  useEffect(() => {
    const prev = prevTemplateRef.current;
    prevTemplateRef.current = template;
    if (!templateConditionsContent || prev === template) return;
    if (documentId) {
      setBlocks([]);
      setDocumentId(null);
      setDocTitle(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatTurns, analyzing]);

  useEffect(() => {
    if (multiResult) resultsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [multiResult, results, isStreaming]);

  useImperativeHandle(ref, () => ({
    mergeCadrage: (partial) => setCadrage((prev) => ({ ...prev, ...partial })),
    appendText: (text) => setUserText((prev) => (prev.trim() ? `${prev}\n\n${text}` : text)),
  }));

  useEffect(() => {
    // En mode multiResult, blocks/documentId singuliers restent toujours vides (voir
    // handleGenerate) — c'est le DERNIER resultat du fil qui fait foi pour les
    // consommateurs externes de onStateChange (ex: "Importer depuis mon CV").
    const latest = multiResult ? results[results.length - 1] : undefined;
    const effectiveBlocks = multiResult ? (latest?.blocks ?? []) : blocks;
    const effectiveDocId = multiResult ? (latest?.documentId ?? null) : documentId;
    const effectiveTitle = multiResult ? (latest?.title ?? null) : docTitle;
    const state: WorkState = {
      cadrage,
      history,
      chatTurns,
      validatedInfo,
      plan,
      blocks: effectiveBlocks,
      documentId: effectiveDocId,
      title: effectiveTitle,
      results: multiResult ? results : undefined,
      projectId: multiResult ? projectId : undefined,
      projectName: multiResult ? projectName : undefined,
    };
    if (!disableLocalStorage) saveState(storageKey, state);
    onStateChange?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cadrage,
    history,
    chatTurns,
    validatedInfo,
    plan,
    blocks,
    documentId,
    docTitle,
    results,
    multiResult,
    projectId,
    projectName,
  ]);

  // Historique des projets : persiste independamment du WorkState du projet actif
  // (cle localStorage separee, voir loadArchivedProjects).
  useEffect(() => {
    if (multiResult && !disableLocalStorage) saveArchivedProjects(storageKey, archivedProjects);
  }, [multiResult, disableLocalStorage, storageKey, archivedProjects]);

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
      template: template || undefined,
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
    const genTemplate = template;
    const isFirstResult = multiResult && results.length === 0;
    if (!multiResult) setDocumentId(null);
    await start(
      `/api/v1/documents/${docType}/generate`,
      { context: buildContext({ adjust_instruction: instruction }) },
      (done) => {
        if (multiResult) {
          setResults((prev) => [
            ...prev,
            { id: crypto.randomUUID(), documentId: done.document_id, title: done.title, blocks: done.blocks, template: genTemplate },
          ]);
          // Nomme le projet a partir du contexte (poste vise) ou, a defaut, du titre
          // genere — mais seulement pour son tout premier document et seulement si le
          // user n'a pas deja renomme le projet (le nom par defaut reste "Projet N").
          if (isFirstResult && DEFAULT_PROJECT_NAME_RE.test(projectName)) {
            const autoName = cadrage.target_role?.trim() || done.title;
            if (autoName) setProjectName(autoName);
          }
        } else {
          setDocumentId(done.document_id);
          setDocTitle(done.title);
        }
      },
    );
  }

  function snapshotProject(): ProjectSnapshot {
    return {
      id: projectId,
      name: projectName,
      cadrage,
      history,
      chatTurns,
      validatedInfo,
      plan,
      results,
      template,
      updatedAt: new Date().toISOString(),
    };
  }

  function isProjectEmpty(snap: Pick<ProjectSnapshot, "results" | "chatTurns">): boolean {
    return snap.results.length === 0 && snap.chatTurns.length === 0;
  }

  function loadProjectIntoActive(snap: ProjectSnapshot) {
    setProjectId(snap.id);
    setProjectName(snap.name);
    setCadrage(snap.cadrage);
    setHistory(snap.history);
    setChatTurns(snap.chatTurns);
    setValidatedInfo(snap.validatedInfo);
    setPlan(snap.plan);
    setResults(snap.results);
    setTemplate(snap.template);
    setAnalysis(null);
    setAnalyzeError(null);
    setUserText("");
  }

  // Change de sujet : archive le projet actif (nomme, jamais supprime — reouvrable
  // depuis l'historique) et repart d'un projet vierge. Le cadrage initial (nom/email
  // pre-remplis depuis le profil) est conserve, pas un etat totalement vide.
  function handleNewDocument() {
    const current = snapshotProject();
    if (!isProjectEmpty(current)) {
      setArchivedProjects((prev) => [current, ...prev]);
    }
    projectCounterRef.current += 1;
    setProjectId(crypto.randomUUID());
    setProjectName(`Projet ${projectCounterRef.current}`);
    setCadrage(initialState?.cadrage ?? {});
    setHistory([]);
    setChatTurns([]);
    setValidatedInfo({});
    setPlan(null);
    setResults([]);
    setAnalysis(null);
    setAnalyzeError(null);
    setUserText("");
    setTemplate(templates[0]?.value ?? "");
  }

  // Rouvre un projet archive : il redevient le projet actif (modifiable, on peut y
  // regenerer/ajuster), et le projet actif courant part a son tour dans l'historique
  // s'il contient quelque chose — jamais deux projets "actifs" en meme temps.
  function openProject(id: string) {
    const target = archivedProjects.find((p) => p.id === id);
    if (!target) return;
    const current = snapshotProject();
    setArchivedProjects((prev) => {
      const withoutTarget = prev.filter((p) => p.id !== id);
      return isProjectEmpty(current) ? withoutTarget : [current, ...withoutTarget];
    });
    loadProjectIntoActive(target);
    setHistoryOpen(false);
  }

  // Extrait le texte d'un fichier joint (PDF/DOCX/TXT) et l'ajoute au brouillon en
  // cours plutot que de l'envoyer directement : le user relit/complete avant d'envoyer,
  // jamais de generation surprise a partir d'une extraction non verifiee.
  async function handleAttachFile(file: File) {
    setAttaching(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/v1/documents/extract-text", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Extraction impossible.");
      const data = await res.json();
      setUserText((prev) => (prev.trim() ? `${prev}\n\n${data.text}` : data.text));
      toast.success("Texte extrait — vérifiez et complétez avant d'envoyer.");
    } catch (err) {
      toast.error("Import du fichier impossible", { description: (err as Error).message });
    } finally {
      setAttaching(false);
    }
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
    <div className="flex flex-col gap-4">
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
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wand2 className="size-3.5" />
            Pour ajuster ce document (« Raccourcis le résumé »...), décrivez la modification dans le chat ci-contre.
          </p>

          {!templateConditionsContent && !templateUpfront && templates.length > 0 && (
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

  // cv/cover_letter : fil de cartes (une par generation/ajustement), jamais ecrasees
  // — chaque carte est une miniature format page (voir PageResultCard), le document
  // complet ne se consulte qu'en agrandi.
  const resultFeed = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3>
          {results.length > 0 ? `${results.length} document${results.length > 1 ? "s" : ""} généré${results.length > 1 ? "s" : ""}` : "Résultat"}
        </h3>
        {results.length > 0 && (
          <button
            type="button"
            onClick={() => setResults([])}
            className="text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Tout effacer
          </button>
        )}
      </div>

      {results.length === 0 && !isStreaming && (
        <div className="flex min-h-40 items-center justify-center rounded-[12px] border border-dashed p-8 text-center text-sm text-muted-foreground">
          Vos documents générés apparaîtront ici.
        </div>
      )}

      {/* max-w ici (pas sur la carte elle-meme) : garde une taille de page realiste
          meme si le panel est tres large, tout en restant pleinement redimensionnable
          en dessous de ce plafond genereux. */}
      <div className="flex flex-col gap-4">
        {results.map((item) => (
          <div key={item.id} className="mx-auto w-full max-w-[800px]">
            <PageResultCard
              documentId={item.documentId}
              title={item.title}
              blocks={item.blocks}
              template={item.template}
              accentColor={item.accentColor}
              darkColor={item.darkColor}
              onAccentColorChange={(hex) =>
                setResults((prev) => prev.map((r) => (r.id === item.id ? { ...r, accentColor: hex } : r)))
              }
              onDarkColorChange={(hex) =>
                setResults((prev) => prev.map((r) => (r.id === item.id ? { ...r, darkColor: hex } : r)))
              }
              onDelete={() => setResults((prev) => prev.filter((r) => r.id !== item.id))}
            />
          </div>
        ))}

        {isStreaming && (
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-1.5">
            <div className="relative aspect-[210/297] w-full overflow-hidden rounded-[10px] border bg-white p-4 shadow-sm">
              <DocumentRenderer blocks={blocks} template={template} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Génération en cours...
            </p>
          </div>
        )}
      </div>
      <div ref={resultsEndRef} />

      {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={() => handleGenerate()} />}
      {hasGenerated && connections}
    </div>
  );

  const leftPanel = (
    <div className="flex flex-col gap-3">
      {beforeCadrage}
      {multiResult && newDocumentLabel && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            {editingProjectName ? (
              <Input
                autoFocus
                value={projectNameDraft}
                onChange={(e) => setProjectNameDraft(e.target.value)}
                onBlur={() => {
                  setProjectName(projectNameDraft.trim() || projectName);
                  setEditingProjectName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingProjectName(false);
                }}
                className="h-7 max-w-[160px] text-sm font-medium"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setProjectNameDraft(projectName);
                  setEditingProjectName(true);
                }}
                className="group flex min-w-0 items-center gap-1 text-left"
                title="Cliquer pour renommer le projet"
              >
                <span className="truncate text-sm font-medium">{projectName}</span>
                <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-[6px] px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Projets précédents"
                    />
                  }
                >
                  <History className="size-3.5" />
                  {archivedProjects.length > 0 && archivedProjects.length}
                  {historyOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </PopoverTrigger>
                {/* Flottant plutot qu'un bloc inline : sinon la liste pousse tout le
                    contenu en dessous (grille de templates, chat...) a chaque ouverture. */}
                <PopoverContent align="start" className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                  {archivedProjects.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">Aucun projet précédent.</p>
                  ) : (
                    archivedProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openProject(p.id)}
                        className="flex items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {p.results.length} document{p.results.length > 1 ? "s" : ""}
                        </span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={handleNewDocument}>
                <Plus className="size-3.5" />
                {newDocumentLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
      {(templateConditionsContent || templateUpfront) && templates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Modèle</Label>
          <TemplateSelector options={templates} value={template} onChange={setTemplate} />
        </div>
      )}
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
                <div className="max-w-[90%] rounded-[12px] rounded-tl-sm bg-muted px-3 py-2 text-sm">
                  <MarkdownContent text={turn.message} />
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

      {/* Composeur façon chat (ChatInput partagé — meme composant que Chat IA/Email/
          Discours) : texte libre ou pièce jointe (PDF/DOCX/TXT), extraite puis ajoutée
          au brouillon avant envoi. Une fois un document genere, envoyer un message
          ici regenere directement avec ce texte comme instruction d'ajustement —
          plus besoin d'un champ separe pour "corriger" le document. */}
      <p className="text-xs text-muted-foreground">
        {hasGenerated ? "Décrivez la modification à apporter au document généré." : textareaLabel}
      </p>
      <ChatInput
        value={userText}
        onValueChange={setUserText}
        onSend={() => {
          if (hasGenerated) {
            const instruction = userText.trim();
            setUserText("");
            handleGenerate(instruction);
          } else {
            handleAnalyze(false);
          }
        }}
        disabled={analyzing || isStreaming}
        clearOnSend={false}
        placeholder={hasGenerated ? "Ex : « Raccourcis le résumé », « Ajoute un stage »..." : textareaPlaceholder}
        onAttachFile={handleAttachFile}
        attaching={attaching}
      />
    </div>
  );

  const rightPanel = multiResult ? resultFeed : resultPanel;

  // Sous lg, un split horizontal redimensionnable n'a pas de sens (pas assez de
  // largeur) — empilement vertical simple.
  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-6">
        {leftPanel}
        {rightPanel}
      </div>
    );
  }

  // Masquer le formulaire/chat pour ne garder que les documents generes — meme
  // logique que masquer la sidebar principale de l'appli.
  const collapseToggle = (
    <button
      type="button"
      onClick={() => setLeftPanelCollapsed((v) => !v)}
      title={leftPanelCollapsed ? "Afficher le formulaire" : "Masquer le formulaire"}
      className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {leftPanelCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex items-center">{collapseToggle}</div>
      <div className="min-h-0 flex-1">
        {leftPanelCollapsed ? (
          <div className="h-full overflow-y-auto">{rightPanel}</div>
        ) : (
          // react-resizable-panels v4 : un nombre nu est interprete en PIXELS, pas en
          // pourcentage (ex: defaultSize={58} = 58px, pas 58%) — d'ou le "figé" qui
          // persistait malgre les corrections precedentes : le panel etait borne a
          // une plage de quelques dizaines de pixels. Chaines de caracteres = pourcentage.
          <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize="58" minSize="35" maxSize="75" className="overflow-y-auto">
              <div className="pr-4">{leftPanel}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="42" minSize="25" maxSize="65" className="overflow-y-auto">
              <div className="pl-4">{rightPanel}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
});
