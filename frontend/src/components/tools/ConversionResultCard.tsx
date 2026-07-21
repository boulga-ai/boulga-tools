import { useState } from "react";
import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function splitExt(filename: string): [string, string] {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return [filename, ""];
  return [filename.slice(0, dot), filename.slice(dot)];
}

export function ConversionResultCard({
  filename,
  sizeLabel,
  compressionInfo,
  url,
  onDelete,
  accentClassName,
}: {
  filename: string;
  sizeLabel?: string;
  compressionInfo?: string;
  url: string;
  onDelete: () => void;
  // Fine bordure gauche coloree, propre a l'outil qui a produit ce resultat (ex. bleu pour
  // Convertir, vert pour Compresser...) — optionnelle, sans effet si non fournie.
  accentClassName?: string;
}) {
  const [baseDefault, ext] = splitExt(filename);
  const [editing, setEditing] = useState(false);
  const [base, setBase] = useState(baseDefault);
  const downloadName = `${base.trim() || baseDefault}${ext}`;

  return (
    <div
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-1 items-center gap-3 rounded-[12px] border bg-white p-3 shadow-sm duration-200",
        accentClassName,
      )}
    >
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={base}
              onChange={(e) => setBase(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditing(false);
              }}
              className="min-w-0 flex-1 rounded-[6px] border border-input bg-white px-1.5 py-0.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span className="shrink-0 text-sm text-muted-foreground">{ext}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Renommer avant de télécharger"
            className="flex max-w-full items-center gap-1 text-left hover:text-bleu-boulga"
          >
            <span className="truncate text-sm font-medium">
              {base}
              {ext}
            </span>
            <Pencil className="size-3 shrink-0 text-muted-foreground" />
          </button>
        )}
        <p className="truncate text-xs text-muted-foreground">{compressionInfo ?? sizeLabel}</p>
      </div>
      <a href={url} download={downloadName} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm">
          <Download className="size-4" />
          Télécharger
        </Button>
      </a>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label="Supprimer"
        title="Supprimer"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
