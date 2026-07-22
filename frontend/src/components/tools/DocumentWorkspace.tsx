"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  Square,
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
  DocBlock,
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

// Mode "controle" du bloc projet (nom + historique + bouton nouveau, voir leftPanel) :
// pro_doc/academic ont deja un historique de projets persiste cote base (sessions,
// voir document_sessions.py) — quand projectsControl est fourni, le bloc affiche et
// manipule CETTE source externe au lieu de son archivage local par defaut
// (archivedProjects/handleNewDocument/openProject, localStorage, cv/cover_letter).
// Le rendu (meme popover, meme bouton) reste identique dans les deux modes.
export type ProjectsControl = {
  activeName: string;
  onRenameActive: (name: string) => void;
  // meta : libelle secondaire libre affiche a droite de chaque entree (ex. "3
  // documents" pour cv/cover_letter en mode local, une date relative pour
  // pro_doc/academic — leur liste de sessions n'a pas de compte de documents bon
  // marche, cf. document_sessions.list_sessions qui exclut deliberement work_state).
  history: { id: string; name: string; meta?: string }[];
  onOpen: (id: string) => void;
  onCreate: () => void;
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
  // selecteur en haut du panneau de gauche. Ne declenche jamais l'invalidation du
  // document existant (voir l'effet cible sur templateConditionsContent seul, plus
  // bas) : changer de skin pur ne perime jamais un document deja genere.
  templateUpfront?: boolean;
  // Plusieurs documents generes coexistent dans le meme projet (fil de cartes,
  // comme Reseaux sociaux/Convertisseur) au lieu d'un document unique ecrase a
  // chaque generation. newDocumentLabel affiche un bouton qui vide le contexte de
  // travail (cadrage/historique/infos validees) pour changer de sujet SANS perdre
  // les documents deja generes — eux persistent independamment.
  newDocumentLabel?: string;
  // pro_doc/academic uniquement — voir le type ProjectsControl ci-dessus.
  projectsControl?: ProjectsControl;
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
  newDocumentLabel,
  projectsControl,
}, ref) {
  const [restored] = useState<Partial<WorkState>>(() =>
    disableLocalStorage ? (initialState ?? {}) : (loadState(storageKey) ?? initialState ?? {}),
  );

  const [cadrage, setCadrage] = useState<Record<string, string>>(restored.cadrage ?? {});
  const [history, setHistory] = useState<ConversationTurn[]>(restored.history ?? []);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>(restored.chatTurns ?? []);
  const [validatedInfo, setValidatedInfo] = useState<Record<string, string>>(restored.validatedInfo ?? {});
  const [plan, setPlan] = useState<PlanItem[] | null>(restored.plan ?? null);

  // Projets nommes : "Nouveau CV"/"Nouvelle lettre" archive
  // le projet actif (jamais supprime) et en ouvre un nouveau vierge — voir
  // handleNewDocument/openProject. Le compteur ne redescend jamais, meme si des
  // projets sont rouverts/refermes, pour ne jamais reutiliser un nom par defaut.
  const projectCounterRef = useRef(1);
  const [projectId, setProjectId] = useState<string>(() => restored.projectId ?? crypto.randomUUID());
  const [projectName, setProjectName] = useState<string>(() => restored.projectName ?? "Projet 1");
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [archivedProjects, setArchivedProjects] = useState<ProjectSnapshot[]>(() => loadArchivedProjects(storageKey));
  const [historyOpen, setHistoryOpen] = useState(false);

  const [userText, setUserText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // documentId renomme en streamDocumentId ici : distinct du champ documentId de
  // chaque ResultItem (le resultat fini), celui-ci suit la generation EN COURS des
  // le tout debut du flux (voir handleRecover).
  const { blocks, isStreaming, error, isQuotaError, progress, documentId: streamDocumentId, truncated, start, stop } = useBlockStream();
  const [template, setTemplate] = useState(templates[0]?.value ?? "");
  const [attaching, setAttaching] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [results, setResults] = useState<ResultItem[]>(restored.results ?? []);
  const hasGenerated = results.length > 0;
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  // En dessous de lg, un split horizontal redimensionnable n'a pas de sens
  // (pas assez de largeur) — academic retombe sur l'empilement vertical simple.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatTurns, analyzing]);

  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [results, isStreaming]);

  useImperativeHandle(ref, () => ({
    mergeCadrage: (partial) => setCadrage((prev) => ({ ...prev, ...partial })),
    appendText: (text) => setUserText((prev) => (prev.trim() ? `${prev}\n\n${text}` : text)),
  }));

  useEffect(() => {
    // C'est le DERNIER resultat du fil qui fait foi pour les consommateurs externes
    // de onStateChange (ex: "Importer depuis mon CV").
    const latest = results[results.length - 1];
    const state: WorkState = {
      cadrage,
      history,
      chatTurns,
      validatedInfo,
      plan,
      blocks: latest?.blocks ?? [],
      documentId: latest?.documentId ?? null,
      title: latest?.title ?? null,
      results,
      projectId,
      projectName,
    };
    if (!disableLocalStorage) saveState(storageKey, state);
    onStateChange?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadrage, history, chatTurns, validatedInfo, plan, results, projectId, projectName]);

  // Historique des projets : persiste independamment du WorkState du projet actif
  // (cle localStorage separee, voir loadArchivedProjects).
  useEffect(() => {
    if (!disableLocalStorage) saveArchivedProjects(storageKey, archivedProjects);
  }, [disableLocalStorage, storageKey, archivedProjects]);

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

  // Partage entre succes complet (done), generation longue interrompue en cours de
  // route (partial) et document recupere apres une coupure de connexion
  // (handleRecover) : dans les trois cas un document existe et merite sa carte —
  // seuls le message affiche et l'origine different. isFirstResult est calcule par
  // l'appelant (avant tout ajout), jamais recalcule ici.
  function applyResult(documentId: string | null, title: string, blocks: DocBlock[], genTemplate: string, isFirstResult: boolean) {
    setResults((prev) => [
      ...prev,
      { id: crypto.randomUUID(), documentId, title, blocks, template: genTemplate },
    ]);
    // Nomme le projet a partir du contexte (poste vise) ou, a defaut, du titre
    // genere — mais seulement pour son tout premier document et seulement si le
    // user n'a pas deja renomme le projet (le nom par defaut reste "Projet N").
    if (isFirstResult && DEFAULT_PROJECT_NAME_RE.test(projectName)) {
      const autoName = cadrage.target_role?.trim() || title;
      if (autoName) setProjectName(autoName);
    }
  }

  async function handleGenerate(instruction?: string) {
    const genTemplate = template;
    const isFirstResult = results.length === 0;

    await start(
      `/api/v1/documents/${docType}/generate`,
      { context: buildContext({ adjust_instruction: instruction }) },
      (done) => {
        if (done.truncated) {
          toast.warning("Document possiblement incomplet", {
            description: "Une section a été coupée par une limite de longueur du modèle — vérifiez le contenu avant de le télécharger.",
          });
        }
        applyResult(done.document_id, done.title, done.blocks, genTemplate, isFirstResult);
      },
      (partial) => {
        const segmentInfo =
          partial.completed_segments != null && partial.total_segments != null
            ? ` (section ${partial.completed_segments}/${partial.total_segments})`
            : "";
        const truncNote = partial.truncated ? " Une section a aussi été coupée par une limite de longueur." : "";
        toast.warning("Génération interrompue", {
          description: `Le document a été enregistré tel quel${segmentInfo} — vous pouvez le télécharger ou relancer une génération.${truncNote}`,
        });
        applyResult(partial.document_id, partial.title, partial.blocks, genTemplate, isFirstResult);
      },
    );
  }

  // Filet de securite quand la connexion casse pendant une generation longue (3-4
  // min, reseau ou redeploiement) sans qu'aucun evenement done/partial n'arrive
  // jamais : le serveur continue pourtant de son cote (voir documents_engine.py
  // _persist), et streamDocumentId (connu des le debut du flux, voir useBlockStream)
  // permet de retrouver ce qui a deja ete sauvegarde plutot que de tout reperdre.
  async function handleRecover() {
    if (!streamDocumentId) return;
    setRecovering(true);
    try {
      const res = await apiFetch(`/api/v1/documents/${streamDocumentId}`);
      if (!res.ok) throw new Error("Document introuvable — la génération n'a peut-être pas encore assez avancé.");
      const data = await res.json();
      const recoveredBlocks: DocBlock[] = data.content_json?.blocks ?? [];
      if (recoveredBlocks.length === 0) {
        throw new Error("Rien n'a encore été généré pour ce document — réessayez dans quelques instants.");
      }
      applyResult(streamDocumentId, data.title || "Document récupéré", recoveredBlocks, template, results.length === 0);
      toast.warning("Document récupéré après une coupure de connexion", {
        description: "Vérifiez qu'il est complet avant de le télécharger — la génération a peut-être été interrompue avant la fin.",
      });
    } catch (err) {
      toast.error("Récupération impossible", { description: (err as Error).message });
    } finally {
      setRecovering(false);
    }
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

  // progress reste null pour toute generation non segmentee (cv/cover_letter, ou
  // pro_doc/academic a plan court) : le texte affiche ne change alors pas d'avant
  // cette fonctionnalite. Segmente (documents longs), il indique la section en
  // cours plutot qu'une attente silencieuse.
  const generationStatus = isStreaming && (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {progress ? `Rédaction en cours — section ${progress.index}/${progress.total}` : "Génération en cours..."}
      </p>
      {/* Signale des la premiere section touchee, sans attendre la fin — une
          section coupee par max_tokens n'est jamais rattrapee par les suivantes. */}
      {truncated && (
        <p className="text-xs text-attention">
          Une section semble avoir été coupée par une limite de longueur du modèle.
        </p>
      )}
    </div>
  );
  const generationProgressBar = isStreaming && progress && (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-bleu-boulga transition-all"
        style={{ width: `${Math.min(100, Math.round((progress.index / progress.total) * 100))}%` }}
      />
    </div>
  );

  // Fil de cartes (une par generation/ajustement), jamais ecrasees — chaque carte
  // est une miniature format page (voir PageResultCard), le document complet ne se
  // consulte qu'en agrandi.
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
            {generationStatus}
            {generationProgressBar}
          </div>
        )}
      </div>
      <div ref={resultsEndRef} />

      {error && (
        <GenerationError
          message={error}
          isQuotaError={isQuotaError}
          onRetry={() => handleGenerate()}
          onRecover={streamDocumentId ? handleRecover : undefined}
          recovering={recovering}
        />
      )}
      {hasGenerated && connections}
    </div>
  );

  const leftPanel = (
    <div className="flex flex-col gap-3">
      {beforeCadrage}
      {newDocumentLabel && (() => {
        // projectsControl (pro_doc/academic) remplace uniquement la donnee et les
        // handlers par une source externe (sessions DB) — le rendu ci-dessous est
        // partage a l'identique par les deux modes.
        const activeName = projectsControl ? projectsControl.activeName : projectName;
        const historyList = projectsControl
          ? projectsControl.history
          : archivedProjects.map((p) => ({
              id: p.id,
              name: p.name,
              meta: `${p.results.length} document${p.results.length > 1 ? "s" : ""}`,
            }));
        const commitRename = (draft: string) => {
          const finalName = draft.trim() || activeName;
          if (projectsControl) projectsControl.onRenameActive(finalName);
          else setProjectName(finalName);
        };
        const openHistoryEntry = (id: string) => (projectsControl ? projectsControl.onOpen(id) : openProject(id));
        const createNew = () => (projectsControl ? projectsControl.onCreate() : handleNewDocument());

        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              {editingProjectName ? (
                <Input
                  autoFocus
                  value={projectNameDraft}
                  onChange={(e) => setProjectNameDraft(e.target.value)}
                  onBlur={() => {
                    commitRename(projectNameDraft);
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
                    setProjectNameDraft(activeName);
                    setEditingProjectName(true);
                  }}
                  className="group flex min-w-0 items-center gap-1 text-left"
                  title="Cliquer pour renommer le projet"
                >
                  <span className="truncate text-sm font-medium">{activeName}</span>
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
                    {historyList.length > 0 && historyList.length}
                    {historyOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </PopoverTrigger>
                  {/* Flottant plutot qu'un bloc inline : sinon la liste pousse tout le
                      contenu en dessous (grille de templates, chat...) a chaque ouverture. */}
                  <PopoverContent align="start" className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                    {historyList.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">Aucun projet précédent.</p>
                    ) : (
                      historyList.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => openHistoryEntry(p.id)}
                          className="flex items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <span className="truncate">{p.name}</span>
                          {p.meta && <span className="shrink-0 text-xs text-muted-foreground">{p.meta}</span>}
                        </button>
                      ))
                    )}
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={createNew}>
                  <Plus className="size-3.5" />
                  {newDocumentLabel}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
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

  // Sous lg, un split horizontal redimensionnable n'a pas de sens (pas assez de
  // largeur) — empilement vertical simple.
  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-6">
        {leftPanel}
        {resultFeed}
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
          <div className="h-full overflow-y-auto">{resultFeed}</div>
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
              <div className="pl-4">{resultFeed}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
});
