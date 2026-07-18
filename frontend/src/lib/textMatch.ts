// Portage TS de la meme logique que backend/app/core/llm/detection.py
// (_build_flexible_pattern) : une citation extraite d'un texte peut ne pas matcher au
// caractere pres dans le texte reconstitue depuis la couche texte pdf.js (ou tout autre
// rendu) a cause de differences d'espaces/sauts de ligne/apostrophes typographiques
// entre l'extraction backend et le frontend. Utilise par PdfViewer (surlignage overlay
// coordonnees, voir PromptAmelioration detection.md) pour retrouver un passage signale
// dans le texte reconstitue de chaque page.
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
