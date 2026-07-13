"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function TagInput({
  tags,
  onChange,
  placeholder = "Ajouter et appuyer sur Entree",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim();
    if (value && !tags.includes(value)) {
      onChange([...tags, value]);
    }
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-[4px] border border-input px-2 py-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga"
        >
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          } else if (e.key === "Backspace" && !draft && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="h-6 flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
