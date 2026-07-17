import Mark from "mark.js";
import { highlightTier, type HighlightTier } from "@/lib/highlightTier";

const TIER_CLASS: Record<Exclude<HighlightTier, null>, string> = {
  light: "bg-attention/25 rounded-[2px]",
  strong: "bg-attention/55 rounded-[2px]",
};

// Portage TS de la meme logique que backend/app/core/llm/detection.py
// (_build_flexible_pattern) : une citation extraite d'un texte peut ne pas matcher au
// caractere pres dans le rendu natif du PDF a cause de differences d'espaces/sauts de
// ligne/apostrophes typographiques entre l'extraction backend et le rendu frontend.
const APOSTROPHE_VARIANTS = "['’‘ʼ`´]";

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildFlexiblePattern(quote: string): RegExp | null {
  const words = quote.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const pattern = words
    .map((w) => escapeRegExp(w).replace(/'/g, APOSTROPHE_VARIANTS))
    .join("\\s+");
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

type Range = { start: number; length: number };

// Efface les surlignages existants dans le conteneur puis reapplique un pour chaque
// citation — utilise par PdfViewer (couche texte pdf.js), seul format avec un rendu
// natif pagine (DOCX/TXT/texte colle passent par HighlightedText, cf.
// UploadedDocViewer). L'intensite depend du score : rien en dessous du seuil "humain",
// plus marque a mesure que le score IA monte, comme chez GPTZero.
//
// On resout nous-memes la position de CHAQUE citation (premiere occurrence trouvee)
// avant de la passer a mark.js via markRanges, plutot que d'utiliser markRegExp — celui-
// ci cherche TOUTES les occurrences du motif dans tout le conteneur, ce qui pour une
// citation courte/ambigue (repli par fenetre glissante, cf. detection.py) peut
// surligner un endroit non voulu, ou produire des <mark> imbriques quand deux citations
// resolues chevauchent la meme zone. Les plages qui se chevauchent (deux citations
// resolues au meme endroit) sont dedupliquees, la premiere trouvee (ordre du texte)
// gagne.
export function applyHighlights(
  container: HTMLElement,
  highlights: { text: string; score: number }[],
): void {
  const instance = new Mark(container);
  instance.unmark({
    done: () => {
      const fullText = container.textContent ?? "";

      const resolved: (Range & { tier: Exclude<HighlightTier, null> })[] = [];
      for (const { text, score } of highlights) {
        const tier = highlightTier(score);
        if (tier === null) continue;
        const pattern = buildFlexiblePattern(text);
        if (pattern === null) continue;
        const match = pattern.exec(fullText);
        if (match === null) continue;
        resolved.push({ start: match.index, length: match[0].length, tier });
      }

      resolved.sort((a, b) => a.start - b.start);
      const byTier: Record<Exclude<HighlightTier, null>, Range[]> = { light: [], strong: [] };
      let cursor = 0;
      for (const range of resolved) {
        if (range.start < cursor) continue; // chevauchement avec la plage precedente
        byTier[range.tier].push({ start: range.start, length: range.length });
        cursor = range.start + range.length;
      }

      (Object.keys(byTier) as Exclude<HighlightTier, null>[]).forEach((tier) => {
        if (byTier[tier].length > 0) {
          instance.markRanges(byTier[tier], { className: TIER_CLASS[tier] });
        }
      });
    },
  });
}
