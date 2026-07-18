import { highlightTier, type HighlightTier } from "@/lib/highlightTier";

type FlaggedSpan = { start: number; end: number; ai_score: number; reason?: string };

// Meme intensite que le surlignage dans le document (HighlightedText/textMatch) — le
// point de couleur ici doit rappeler visuellement la marque dans le texte, pas
// introduire une echelle de couleur separee (rouge/vert) qui n'a pas de sens au niveau
// d'une phrase individuelle.
const TIER_DOT: Record<Exclude<HighlightTier, null>, string> = {
  light: "bg-attention/50",
  strong: "bg-attention",
};

// Liste EXHAUSTIVE des phrases signalees (tout score >= seuil "mixte", pas une
// selection des N plus marquantes) — meme principe que le surlignage dans le document :
// aucune phrase flaggee ne doit etre omise de cette liste. Triee par score decroissant
// ("vos phrases les plus IA" en premier, comme GPTZero), a score egal par ordre
// d'apparition dans le texte.
export function AiSentenceList({
  text,
  spans,
}: {
  text: string;
  spans: FlaggedSpan[];
}) {
  const sentences = spans
    .map((s) => ({ ...s, tier: highlightTier(s.ai_score), quote: text.slice(s.start, s.end).trim() }))
    .filter((s): s is typeof s & { tier: Exclude<HighlightTier, null> } => s.tier !== null && s.quote.length > 0)
    .sort((a, b) => b.ai_score - a.ai_score || a.start - b.start);

  if (sentences.length === 0) {
    return (
      <div className="rounded-[12px] border bg-card p-4 text-sm text-muted-foreground">
        Aucune phrase signalée comme générée par IA.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Phrases signalées</p>
        <span className="text-xs text-muted-foreground">
          {sentences.length} phrase{sentences.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {sentences.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-[8px] border px-2.5 py-2 text-sm"
          >
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${TIER_DOT[s.tier]}`} />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="leading-snug">{s.quote}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-attention">{s.ai_score}% IA</span>
                {s.reason && <span className="text-xs text-muted-foreground">· {s.reason}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
