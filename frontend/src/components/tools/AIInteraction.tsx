"use client";

import { useState } from "react";
import { Check, X, Pencil, Plus, Loader2, Info, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/tools/MarkdownContent";
import type {
  InteractionBlock,
  SuggestionBlockData,
  TagsBlockData,
  QuestionBlockData,
  ChoiceBlockData,
  InfoBlockData,
  SectionPreviewBlockData,
} from "@/types/interaction";

const ENTER_ANIM = "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards";

function SuggestionBlock({ block }: { block: SuggestionBlockData }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.value);

  function commitEdit() {
    setEditing(false);
    if (draft.trim() && draft !== block.value) block.onEdit(draft.trim());
  }

  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 rounded-[10px] border p-3 transition-colors",
        block.status === "accepted" && "border-succes/40 bg-succes/5",
        block.status === "rejected" && "border-border bg-muted/40 opacity-60",
        block.status === "pending" && "border-border bg-card",
      )}
    >
      <p className="text-xs font-medium uppercase text-muted-foreground">{block.label}</p>
      {editing ? (
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          className="min-h-16 text-sm"
        />
      ) : (
        <p className="text-sm">{block.value}</p>
      )}
      {!editing && (
        <div className="flex items-center gap-3 pt-0.5 opacity-60 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={block.onAccept}
            className={cn(
              "flex items-center gap-1 text-xs font-medium hover:text-succes",
              block.status === "accepted" ? "text-succes" : "text-muted-foreground",
            )}
          >
            <Check className="size-3.5" /> Accepter
          </button>
          <button
            type="button"
            onClick={block.onReject}
            className={cn(
              "flex items-center gap-1 text-xs font-medium hover:text-erreur",
              block.status === "rejected" ? "text-erreur" : "text-muted-foreground",
            )}
          >
            <X className="size-3.5" /> Refuser
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(block.value);
              setEditing(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-bleu-boulga"
          >
            <Pencil className="size-3.5" /> Modifier
          </button>
        </div>
      )}
    </div>
  );
}

function TagsBlock({ block }: { block: TagsBlockData }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commitAdd() {
    if (draft.trim()) block.onAdd(draft.trim());
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border bg-card p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{block.label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {block.tags.map((tag) => (
          <span
            key={tag}
            className="group/tag flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-bleu-boulga"
          >
            {tag}
            <button
              type="button"
              onClick={() => block.onRemove(tag)}
              className="text-bleu-boulga/60 hover:text-erreur"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {adding ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => e.key === "Enter" && commitAdd()}
            placeholder="Nouveau..."
            className="h-7 w-32 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-bleu-boulga hover:text-bleu-boulga"
          >
            <Plus className="size-3" /> Ajouter
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({ block }: { block: QuestionBlockData }) {
  const [draft, setDraft] = useState(block.answer ?? "");
  const answered = block.answer !== undefined && block.answer !== "";

  if (answered) {
    return (
      <div className="flex flex-col gap-1 rounded-[10px] border border-succes/30 bg-succes/5 p-3">
        <p className="text-sm text-muted-foreground">{block.question}</p>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Check className="size-3.5 text-succes" /> {block.answer}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border bg-card p-3">
      <p className="text-sm">{block.question}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && block.onAnswer(draft.trim())}
          placeholder={block.placeholder ?? "Votre réponse..."}
          className="h-8 max-w-xs text-sm"
        />
        <Button size="sm" variant="outline" onClick={() => draft.trim() && block.onAnswer(draft.trim())}>
          Répondre
        </Button>
        {block.optional && (
          <button
            type="button"
            onClick={() => block.onAnswer("")}
            className="text-xs text-muted-foreground hover:underline"
          >
            Passer →
          </button>
        )}
      </div>
    </div>
  );
}

function ChoiceBlock({ block }: { block: ChoiceBlockData }) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border bg-card p-3">
      <p className="text-sm">{block.question}</p>
      <div className="flex flex-wrap gap-2">
        {block.options.map((option) => {
          const selected = option.value === block.chosen;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => block.onChoose(option.value)}
              className={cn(
                "flex flex-col gap-0.5 rounded-[8px] border px-3 py-2 text-left text-sm transition-colors",
                selected ? "border-bleu-boulga bg-blue-50" : "border-border hover:bg-accent",
              )}
            >
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <span className="text-xs text-muted-foreground">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const INFO_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle };
const INFO_CLASS = {
  info: "border-border bg-muted/40 text-foreground",
  success: "border-succes/30 bg-succes/5 text-succes",
  warning: "border-attention/30 bg-attention/5 text-attention",
};

function InfoBlock({ block }: { block: InfoBlockData }) {
  const Icon = INFO_ICON[block.variant];
  return (
    <div className={cn("flex items-start gap-2 rounded-[10px] border p-3 text-sm", INFO_CLASS[block.variant])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{block.text}</p>
    </div>
  );
}

function SectionPreviewBlock({ block }: { block: SectionPreviewBlockData }) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{block.title}</p>
        <div className="flex items-center gap-2">
          {block.onEdit && (
            <button
              type="button"
              onClick={block.onEdit}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-bleu-boulga"
            >
              <Pencil className="size-3.5" /> Modifier
            </button>
          )}
          {block.onRegenerate && (
            <button
              type="button"
              onClick={block.onRegenerate}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-bleu-boulga"
            >
              <RotateCcw className="size-3.5" /> Régénérer
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <MarkdownContent text={block.content} />
      </div>
    </div>
  );
}

export function AIInteraction({
  blocks,
  loading,
  loadingLabel = "L'IA réfléchit...",
  emptyHint,
}: {
  blocks: InteractionBlock[];
  loading?: boolean;
  loadingLabel?: string;
  emptyHint?: string;
}) {
  if (blocks.length === 0 && !loading) {
    return emptyHint ? <p className="text-sm text-muted-foreground italic">{emptyHint}</p> : null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block, i) => (
        <div key={block.id} className={ENTER_ANIM} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          {block.type === "suggestion" && <SuggestionBlock block={block} />}
          {block.type === "tags" && <TagsBlock block={block} />}
          {block.type === "question" && <QuestionBlock block={block} />}
          {block.type === "choice" && <ChoiceBlock block={block} />}
          {block.type === "info" && <InfoBlock block={block} />}
          {block.type === "section" && <SectionPreviewBlock block={block} />}
        </div>
      ))}
      {loading && (
        <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {loadingLabel}
        </div>
      )}
    </div>
  );
}
