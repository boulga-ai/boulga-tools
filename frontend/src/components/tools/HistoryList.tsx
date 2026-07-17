import { FileText } from "lucide-react";

export type HistoryItem = {
  id: string;
  title: string;
  created_at: string;
  score: number | null;
};

function scoreColorClass(score: number): string {
  if (score >= 50) return "border-erreur/30 bg-erreur/10 text-erreur";
  if (score >= 25) return "border-attention/30 bg-attention/10 text-attention";
  return "border-succes/30 bg-succes/10 text-succes";
}

// Liste compacte façon GPTZero : icône + nom + pastille de score par entrée, au lieu
// d'une simple colonne de texte tronqué sans indicateur.
export function HistoryList({
  items,
  onSelect,
  emptyLabel,
  scoreLabel = "IA",
}: {
  items: HistoryItem[];
  onSelect: (id: string) => void;
  emptyLabel: string;
  scoreLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-accent"
        >
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">{item.title || "Sans titre"}</span>
          {item.score !== null && (
            <span
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${scoreColorClass(item.score)}`}
            >
              {item.score}% {scoreLabel}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
