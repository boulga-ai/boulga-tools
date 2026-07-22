// Miroir volontairement minimal de TEMPLATE_STYLES (backend/app/core/document_engine/
// renderer.py) — uniquement ce qui affecte visuellement le preview live
// (DocumentRenderer) : sans ca, le preview ne ressemble jamais au fichier telecharge
// pour les templates a mise en page distincte (sidebar CV moderne, bandeau lettre/pro
// moderne, police par template).

export type CoverStyle = "banner" | "minimal" | "formal" | "clean" | null;

export type TemplateStyleInfo = {
  cvSidebar: boolean;
  letterBanner: boolean;
  coverStyle: CoverStyle;
  fontFamily: string;
  // Miroir de TemplateStyle.accent_hex/dark_hex (renderer.py) — sans ca, le preview
  // affiche toujours le bleu/marine Boulga par defaut au lieu de la couleur propre
  // au template choisi (ex: gris pour Academique/Concours, vert pour Etudiant).
  accentHex: string;
  darkHex: string;
};

const DEFAULT_STYLE: TemplateStyleInfo = {
  cvSidebar: false,
  letterBanner: false,
  coverStyle: null,
  fontFamily: "inherit",
  accentHex: "#1565C0",
  darkHex: "#0B1F3A",
};

const ARIAL = "Arial, Helvetica, sans-serif";
const TIMES = '"Times New Roman", Times, serif';
const BLEU_BOULGA = "#1565C0";
const MARINE = "#0B1F3A";

export const TEMPLATE_STYLES: Record<string, TemplateStyleInfo> = {
  cv_modern: { cvSidebar: true, letterBanner: false, coverStyle: null, fontFamily: ARIAL, accentHex: BLEU_BOULGA, darkHex: MARINE },
  cv_classic: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: ARIAL, accentHex: "#0E7C6B", darkHex: "#0B4A3D" },
  cv_academique: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES, accentHex: "#333333", darkHex: "#1A1A1A" },
  cv_concours: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES, accentHex: "#37474F", darkHex: "#263238" },
  letter_standard: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES, accentHex: BLEU_BOULGA, darkHex: MARINE },
  letter_modern: { cvSidebar: false, letterBanner: true, coverStyle: null, fontFamily: ARIAL, accentHex: BLEU_BOULGA, darkHex: MARINE },
  letter_concours: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES, accentHex: "#37474F", darkHex: "#263238" },
  letter_academique: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES, accentHex: "#333333", darkHex: "#1A1A1A" },
  pro_corporate: { cvSidebar: false, letterBanner: false, coverStyle: "banner", fontFamily: ARIAL, accentHex: BLEU_BOULGA, darkHex: MARINE },
  pro_minimal: { cvSidebar: false, letterBanner: false, coverStyle: "minimal", fontFamily: ARIAL, accentHex: "#45607A", darkHex: "#37474F" },
  pro_moderne: { cvSidebar: false, letterBanner: false, coverStyle: "banner", fontFamily: ARIAL, accentHex: "#0E7C6B", darkHex: "#0B4A3D" },
  academic_formal: { cvSidebar: false, letterBanner: false, coverStyle: "formal", fontFamily: TIMES, accentHex: BLEU_BOULGA, darkHex: MARINE },
  academic_clean: { cvSidebar: false, letterBanner: false, coverStyle: "clean", fontFamily: ARIAL, accentHex: "#37474F", darkHex: "#263238" },
  academic_classique: { cvSidebar: false, letterBanner: false, coverStyle: "clean", fontFamily: TIMES, accentHex: "#7B2D26", darkHex: "#4A1B17" },
};

export function getTemplateStyle(template: string | undefined): TemplateStyleInfo {
  if (!template) return DEFAULT_STYLE;
  return TEMPLATE_STYLES[template] ?? DEFAULT_STYLE;
}

// Memes types de blocs que sidebar_types cote backend (_render_cv_sidebar,
// renderer.py) — doivent rester synchronises.
export const CV_SIDEBAR_BLOCK_TYPES = new Set(["contact", "skill_group", "language_group"]);
