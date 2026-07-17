// Derive une phrase de confiance en langage naturel a partir d'un score 0-100 — meme
// principe que GPTZero ("We are moderately confident..."), seuils simples.
export function confidenceSentence(score: number, subject: string): string {
  const level = score >= 70 ? "très" : score >= 40 ? "moyennement" : "peu";
  return `Nous sommes ${level} confiants que ${subject}.`;
}
