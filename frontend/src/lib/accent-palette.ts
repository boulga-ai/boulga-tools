// Palette curatee de couleurs d'accent choisissables (cv/cover_letter uniquement) —
// doit rester synchronisee avec ACCENT_PALETTE (backend/app/core/document_engine/
// palette.py). Hex SANS "#" : c'est ce qui est envoye tel quel au backend
// (RenderRequest.accent_color) ; prefixer "#" seulement pour un usage CSS.
export const ACCENT_PALETTE: { label: string; hex: string }[] = [
  { label: "Bleu", hex: "1565C0" },
  { label: "Émeraude", hex: "0E7C6B" },
  { label: "Bordeaux", hex: "7B2D26" },
  { label: "Anthracite", hex: "37474F" },
  { label: "Marine", hex: "0B1F3A" },
  { label: "Aubergine", hex: "5B3A5C" },
  { label: "Ardoise", hex: "45607A" },
  { label: "Bronze", hex: "8A6535" },
];
