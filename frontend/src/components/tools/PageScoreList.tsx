type PageScore = { page: number; ai_score: number | null; too_short: boolean };

export function PageScoreList({
  pageScores,
  pagesAnalyzed,
  totalPages,
  pagesExact,
}: {
  pageScores: PageScore[];
  pagesAnalyzed: number;
  totalPages: number;
  pagesExact: boolean;
}) {
  if (pageScores.length === 0) return null;

  // Le DOCX sans coupure de page manuelle n'a pas de vraies frontieres de page (voir
  // text_extraction.py) — on l'affiche comme "Section" plutot que "Page" pour ne pas
  // laisser croire a une pagination fiable qu'on n'a pas.
  const label = pagesExact ? "Page" : "Section";
  const unit = pagesExact ? "pages" : "sections";
  const flaggedCount = pageScores.filter((p) => p.ai_score !== null && p.ai_score >= 50).length;

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Analyse {pagesExact ? "page par page" : "par section"}
        </p>
        <span className="text-xs text-muted-foreground">
          {flaggedCount}/{pageScores.length} {unit} avec IA détectée
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {pageScores.map((p) => (
          <div
            key={p.page}
            className="flex items-center justify-between rounded-[8px] px-2 py-1.5 text-sm"
          >
            <span>
              {label} {p.page}
            </span>
            {p.too_short ? (
              <span className="text-xs text-muted-foreground">Trop courte pour être analysée</span>
            ) : (
              <span
                className={
                  (p.ai_score ?? 0) >= 50
                    ? "text-xs font-medium text-erreur"
                    : "text-xs font-medium text-succes"
                }
              >
                {p.ai_score}% IA
              </span>
            )}
          </div>
        ))}
      </div>

      {pagesAnalyzed < totalPages && (
        <p className="border-t pt-2 text-xs text-muted-foreground">
          Seules les {pagesAnalyzed} premières {unit} sur {totalPages} ont été analysées selon
          votre palier — passez à un palier supérieur pour couvrir tout le document.
        </p>
      )}
    </div>
  );
}
