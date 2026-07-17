import { highlightTier } from "@/lib/highlightTier";

type Span = { start: number; end: number; ai_score?: number };

const TIER_CLASS = {
  light: "rounded-[2px] bg-attention/25 px-0.5",
  strong: "rounded-[2px] bg-attention/55 px-0.5",
};

// Sans ai_score (plagiat : correspondances ponctuelles, pas de couverture exhaustive),
// chaque span garde l'intensite unique d'avant. Avec ai_score (detecteur IA : couverture
// phrase par phrase), l'intensite suit le score — rien sous le seuil "humain", plus
// marque a mesure qu'il monte, comme chez GPTZero.
export function HighlightedText({ text, spans }: { text: string; spans: Span[] }) {
  const sorted = [...spans]
    .map((span) => ({
      ...span,
      className:
        span.ai_score === undefined
          ? TIER_CLASS.strong
          : TIER_CLASS[highlightTier(span.ai_score) ?? "light"],
      skip: span.ai_score !== undefined && highlightTier(span.ai_score) === null,
    }))
    .filter((span) => !span.skip)
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((span, i) => {
    if (span.start > cursor) parts.push(text.slice(cursor, span.start));
    if (span.start < cursor) return; // chevauchement avec le span precedent, deja couvert
    parts.push(
      <mark key={i} className={span.className}>
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = Math.max(cursor, span.end);
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
