import Mark from "mark.js";

// Portage TS de la meme logique que backend/app/core/llm/detection.py
// (_build_flexible_pattern) : une citation extraite d'un texte peut ne pas matcher au
// caractere pres dans un rendu natif (PDF/DOCX) a cause de differences d'espaces/sauts
// de ligne/apostrophes typographiques entre l'extraction backend et le rendu frontend.
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
// citation — utilise par PdfViewer (couche texte pdf.js) et DocxViewer (rendu
// docx-preview), meme comportement dans les deux cas.
export function applyHighlights(container: HTMLElement, highlights: string[]): void {
  const instance = new Mark(container);
  instance.unmark({
    done: () => {
      for (const quote of highlights) {
        const pattern = buildFlexiblePattern(quote);
        if (pattern) {
          instance.markRegExp(pattern, { className: "bg-attention/40 rounded-[2px]" });
        }
      }
    },
  });
}
