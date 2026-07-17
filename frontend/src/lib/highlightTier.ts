export type HighlightTier = "light" | "strong" | null;

// Memes seuils que lib/confidence.ts (40/70) — un score bas ne doit generer aucun
// surlignage (texte juge humain), un score tres eleve doit ressortir plus fortement
// qu'un score moyen, comme chez GPTZero.
export function highlightTier(score: number): HighlightTier {
  if (score >= 70) return "strong";
  if (score >= 40) return "light";
  return null;
}
