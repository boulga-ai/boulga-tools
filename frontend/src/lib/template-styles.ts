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
};

const DEFAULT_STYLE: TemplateStyleInfo = {
  cvSidebar: false,
  letterBanner: false,
  coverStyle: null,
  fontFamily: "inherit",
};

const ARIAL = "Arial, Helvetica, sans-serif";
const TIMES = '"Times New Roman", Times, serif';

export const TEMPLATE_STYLES: Record<string, TemplateStyleInfo> = {
  cv_modern: { cvSidebar: true, letterBanner: false, coverStyle: null, fontFamily: ARIAL },
  cv_classic: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES },
  letter_standard: { cvSidebar: false, letterBanner: false, coverStyle: null, fontFamily: TIMES },
  letter_modern: { cvSidebar: false, letterBanner: true, coverStyle: null, fontFamily: ARIAL },
  pro_corporate: { cvSidebar: false, letterBanner: false, coverStyle: "banner", fontFamily: ARIAL },
  pro_minimal: { cvSidebar: false, letterBanner: false, coverStyle: "minimal", fontFamily: ARIAL },
  academic_formal: { cvSidebar: false, letterBanner: false, coverStyle: "formal", fontFamily: TIMES },
  academic_clean: { cvSidebar: false, letterBanner: false, coverStyle: "clean", fontFamily: ARIAL },
};

export function getTemplateStyle(template: string | undefined): TemplateStyleInfo {
  if (!template) return DEFAULT_STYLE;
  return TEMPLATE_STYLES[template] ?? DEFAULT_STYLE;
}

// Memes types de blocs que sidebar_types cote backend (_render_cv_sidebar,
// renderer.py) — doivent rester synchronises.
export const CV_SIDEBAR_BLOCK_TYPES = new Set(["contact", "skill_group", "language_group"]);
