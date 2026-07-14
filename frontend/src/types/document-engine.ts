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
};

export type GenerateDoneEvent = {
  document_id: string | null;
  title: string;
  blocks: DocBlock[];
};
