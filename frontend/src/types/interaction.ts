export type SuggestionBlockData = {
  type: "suggestion";
  id: string;
  label: string;
  value: string;
  status: "pending" | "accepted" | "rejected";
  onAccept: () => void;
  onReject: () => void;
  onEdit: (value: string) => void;
};

export type TagsBlockData = {
  type: "tags";
  id: string;
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
};

export type QuestionBlockData = {
  type: "question";
  id: string;
  question: string;
  placeholder?: string;
  optional: boolean;
  answer?: string;
  onAnswer: (answer: string) => void;
};

export type ChoiceOption = { label: string; value: string; description?: string };

export type ChoiceBlockData = {
  type: "choice";
  id: string;
  question: string;
  options: ChoiceOption[];
  chosen?: string;
  onChoose: (value: string) => void;
};

export type InfoBlockData = {
  type: "info";
  id: string;
  text: string;
  variant: "info" | "success" | "warning";
};

export type SectionPreviewBlockData = {
  type: "section";
  id: string;
  title: string;
  content: string;
  status?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
};

export type InteractionBlock =
  | SuggestionBlockData
  | TagsBlockData
  | QuestionBlockData
  | ChoiceBlockData
  | InfoBlockData
  | SectionPreviewBlockData;
