"use client";

import { FileText, Type } from "lucide-react";

// Composant segmenté Texte/Fichier — remplace les liens de texte perdus dans le flux
// ("Importer un fichier à la place" / "Coller du texte à la place").
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: "text" | "file";
  onChange: (mode: "text" | "file") => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-[8px] border p-0.5">
      <button
        type="button"
        onClick={() => onChange("text")}
        className={
          mode === "text"
            ? "flex items-center gap-1.5 rounded-[6px] bg-bleu-boulga px-3 py-1.5 text-xs font-medium text-white"
            : "flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
        }
      >
        <Type className="size-3.5" />
        Texte
      </button>
      <button
        type="button"
        onClick={() => onChange("file")}
        className={
          mode === "file"
            ? "flex items-center gap-1.5 rounded-[6px] bg-bleu-boulga px-3 py-1.5 text-xs font-medium text-white"
            : "flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
        }
      >
        <FileText className="size-3.5" />
        Fichier
      </button>
    </div>
  );
}
