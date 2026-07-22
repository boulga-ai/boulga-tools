export type DocType = "cv" | "cover_letter" | "pro_doc" | "academic";

export type DocBlock = { type: string; [key: string]: unknown };

export type AnalyzeQuestion = {
  id: string;
  text: string;
  optional: boolean;
  input_type?: string;
};

export type AnalyzeSuggestion = {
  id: string;
  label: string;
  value: string;
  target?: string;
  recommended?: boolean;
};

export type PlanItem = { heading: string; summary: string };

export type AnalyzeResponse = {
  message: string;
  questions: AnalyzeQuestion[];
  suggestions: AnalyzeSuggestion[];
  can_propose_plan: boolean;
  proposed_plan: PlanItem[] | null;
};

export type ConversationTurn = { role: "user" | "assistant"; content: string };

// Tours enrichis pour l'affichage chat (le fil s'empile, rien n'est jamais
// effacé) — distinct de ConversationTurn qui reste le format brut envoyé au
// backend. Un tour assistant garde ses propres questions/suggestions et leur
// état de résolution, ancrés à ce tour précis plutôt que dans un état unique
// écrasé à chaque appel.
export type ChatQuestionState = AnalyzeQuestion & { answer?: string };
export type ChatSuggestionState = AnalyzeSuggestion & { status: "pending" | "accepted" | "rejected" };

export type ChatTurn =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      message: string;
      questions: ChatQuestionState[];
      suggestions: ChatSuggestionState[];
    };

// "competence" reste un vocabulaire produit abstrait — jamais un nom de modèle
// affiché au user. "depth" reprend l'échelle déjà utilisée par le Générateur de plan.
export type Competence = "standard" | "expert";
export type DetailDepth = "essentiel" | "detaille" | "tres_detaille";

export type DocEngineContext = {
  cadrage: Record<string, string>;
  history: ConversationTurn[];
  validated_info: Record<string, string>;
  plan?: PlanItem[] | null;
  user_message: string;
  request_plan: boolean;
  adjust_instruction?: string;
  competence?: Competence;
  depth?: DetailDepth;
  // Pour cv/cover_letter, conditionne aussi le vocabulaire de blocs et la consigne LLM
  // (voir backend blocks.TEMPLATE_OVERRIDES) — pour pro_doc/academic, ignoré par le
  // backend (habillage pur, décidé au rendu seulement).
  template?: string;
};

export type WorkState = {
  cadrage: Record<string, string>;
  history: ConversationTurn[];
  chatTurns: ChatTurn[];
  validatedInfo: Record<string, string>;
  plan: PlanItem[] | null;
  blocks: DocBlock[];
  documentId: string | null;
  title: string | null;
  // multiResult (cv/cover_letter) uniquement — voir DocumentWorkspace. Absents pour
  // pro_doc/academic, qui n'ont pas ce concept de projet nomme/fil de resultats.
  results?: ResultItem[];
  projectId?: string;
  projectName?: string;
};

// Un document genere dans un projet multiResult (cv/cover_letter) — voir
// PageResultCard. Fait partie de WorkState/ProjectSnapshot, jamais persiste seul.
export type ResultItem = { id: string; documentId: string | null; title: string; blocks: DocBlock[]; template: string };

// Un projet archive (voir DocumentWorkspace.handleNewDocument/openProject) : instantane
// complet de tout ce qu'un projet multiResult porte, hors mise en forme UI (titre en
// cours d'edition, erreurs d'analyse...). Rangee dans son propre historique quand le
// user en ouvre un nouveau, jamais supprimee automatiquement.
export type ProjectSnapshot = {
  id: string;
  name: string;
  cadrage: Record<string, string>;
  history: ConversationTurn[];
  chatTurns: ChatTurn[];
  validatedInfo: Record<string, string>;
  plan: PlanItem[] | null;
  results: ResultItem[];
  template: string;
  updatedAt: string;
};

export type GenerateDoneEvent = {
  document_id: string | null;
  title: string;
  blocks: DocBlock[];
};
