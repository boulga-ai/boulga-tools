import { HighlightedText } from "@/components/tools/HighlightedText";

type Span = { start: number; end: number; ai_score?: number };
type PageScore = { page: number; ai_score: number | null; too_short: boolean };

function PagedHighlightedText({
  text,
  spans,
  pageRanges,
  pageScores,
  totalPages,
  label,
}: {
  text: string;
  spans: Span[];
  pageRanges: [number, number][];
  pageScores: PageScore[];
  totalPages: number;
  label: string;
}) {
  return (
    <div className="flex max-h-[720px] flex-col gap-4 overflow-y-auto rounded-[12px] border bg-card p-4">
      {pageRanges.map(([start, end], i) => {
        const score = pageScores[i] as PageScore | undefined;
        // Spans recadres sur cette page : on ne garde que ceux qui la recouvrent au
        // moins partiellement, et on retranche `start` pour que HighlightedText (qui
        // attend des offsets relatifs au texte qu'on lui passe, pas au document entier)
        // les positionne correctement dans le texte de CETTE page.
        const pageSpans = spans
          .filter((s) => s.start < end && s.end > start)
          .map((s) => ({
            ...s,
            start: Math.max(s.start, start) - start,
            end: Math.min(s.end, end) - start,
          }));

        return (
          <div key={i} className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>
                {label} {i + 1} / {totalPages}
              </span>
              {score && !score.too_short && score.ai_score !== null && (
                <span className={score.ai_score >= 50 ? "text-erreur" : "text-succes"}>
                  — {score.ai_score}% IA
                </span>
              )}
            </p>
            {score?.too_short ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Trop courte pour être analysée
              </p>
            ) : (
              <div className="rounded-lg border p-3 text-sm">
                <HighlightedText text={text.slice(start, end)} spans={pageSpans} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Affiche un fichier uploade avec les passages signales surlignes dessus.
//
// Option A (voir PromptAmelioration detection.md, Prompt 2) : le surlignage se fait sur
// le TEXTE EXTRAIT, jamais sur un rendu visuel du PDF — les flagged_spans sont des
// offsets dans le texte extrait par pypdf, sans correspondance directe avec les
// positions visuelles d'un rendu PDF natif (pdf.js). Rendre le texte extrait est fiable
// a 100% (meme texte, memes offsets) ; un rendu PDF natif avec overlay pdf.js
// (page.getTextContent() + rectangles positionnes) resterait une amelioration future
// possible (Option B), non implementee ici.
//
// Quand pageRanges est fourni (detecteur IA sur PDF/DOCX a coupures exactes), le texte
// est decoupe par page avec un en-tete "Page N / Total" et le score de cette page, comme
// chez GPTZero. Sans pageRanges (plagiat, texte colle, DOCX sans coupures), un seul bloc
// continu est affiche.
export function UploadedDocViewer({
  text,
  spans,
  pageRanges,
  pageScores,
  totalPages,
  pagesExact = true,
}: {
  file: File | null;
  text: string;
  spans: Span[];
  pageRanges?: [number, number][];
  pageScores?: PageScore[];
  totalPages?: number;
  pagesExact?: boolean;
}) {
  if (pageRanges && pageRanges.length > 0) {
    return (
      <PagedHighlightedText
        text={text}
        spans={spans}
        pageRanges={pageRanges}
        pageScores={pageScores ?? []}
        totalPages={totalPages ?? pageRanges.length}
        label={pagesExact ? "Page" : "Section"}
      />
    );
  }

  return (
    <div className="max-h-[720px] overflow-y-auto rounded-[12px] border bg-card p-4 text-sm">
      <HighlightedText text={text} spans={spans} />
    </div>
  );
}
