import { Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-1 items-center gap-3 rounded-[12px] border bg-white p-3 shadow-sm duration-200",
        accentClassName,
      )}
    >
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename}</p>
        <p className="truncate text-xs text-muted-foreground">{compressionInfo ?? sizeLabel}</p>
      </div>
      <a href={url} download={filename} target="_blank" rel="noreferrer">
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
