// Bloc "Vocabulaire IA détecté" — expressions typiques d'un texte genere par IA
// (connecteurs sur-utilises, tournures figees...) reellement reperees dans CE texte par
// le LLM (voir ai_vocabulary dans detection.py, jamais une liste generique). Chaque
// marqueur est cliquable : au clic, le viewer defile vers sa premiere occurrence dans le
// texte (voir onSelect, cable cote page.tsx via les bornes de page).
export function AiVocabularyList({
  terms,
  onSelect,
}: {
  terms: string[];
  onSelect?: (term: string) => void;
}) {
  if (terms.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Vocabulaire IA détecté
        </p>
        <span className="text-xs text-muted-foreground">
          {terms.length} marqueur{terms.length > 1 ? "s" : ""} IA détecté{terms.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect?.(term)}
            className="rounded-full border border-attention/30 bg-attention/10 px-2.5 py-1 text-xs font-medium text-attention hover:bg-attention/20"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
