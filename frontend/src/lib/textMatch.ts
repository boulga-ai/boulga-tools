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

// Efface les surlignages existants dans le conteneur puis reapplique un pour chaque
// citation — utilise par PdfViewer (couche texte pdf.js), seul format avec un rendu
// natif pagine (DOCX/TXT/texte colle passent par HighlightedText, cf.
// UploadedDocViewer). L'intensite depend du score : rien en dessous du seuil "humain",
// plus marque a mesure que le score IA monte, comme chez GPTZero.
export function applyHighlights(
  container: HTMLElement,
  highlights: { text: string; score: number }[],
): void {
  const instance = new Mark(container);
  instance.unmark({
    done: () => {
      for (const { text, score } of highlights) {
        const tier = highlightTier(score);
        if (tier === null) continue;
        const pattern = buildFlexiblePattern(text);
        if (pattern) {
          instance.markRegExp(pattern, { className: TIER_CLASS[tier] });
        }
      }
    },
  });
}
