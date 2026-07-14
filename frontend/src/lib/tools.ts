export type ToolPack = "gratuit" | "redaction" | "documents";

export type ToolAccess = "libre" | "gratuit_inscription" | "score_gratuit" | "des_goutte";

export type Tool = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string; // nom d'icône lucide-react
  pack: ToolPack;
  access: ToolAccess;
};

export const PACK_LABELS: Record<ToolPack, string> = {
  gratuit: "Outils gratuits",
  redaction: "Rédaction",
  documents: "Documents avancés",
};

export const ACCESS_BADGES: Record<ToolAccess, { label: string; className: string }> = {
  libre: {
    label: "Gratuit et illimité",
    className: "bg-succes/10 text-succes",
  },
  gratuit_inscription: {
    label: "Gratuit dès l'inscription",
    className: "bg-succes/10 text-succes",
  },
  score_gratuit: {
    label: "Score gratuit",
    className: "bg-succes/10 text-succes",
  },
  des_goutte: {
    label: "Dès le palier Goutte",
    className: "bg-blue-50 text-bleu-boulga",
  },
};

export const TOOLS: Tool[] = [
  {
    id: "converter",
    label: "Convertisseur de fichiers",
    description: "Convertit PDF, Word, Excel, PowerPoint et images, avec fusion et séparation de PDF.",
    href: "/tools/converter",
    icon: "ArrowRightLeft",
    pack: "gratuit",
    access: "libre",
  },
  {
    id: "ai-detector",
    label: "Détecteur de contenu IA",
    description: "Estime la probabilité qu'un texte ait été généré par une IA.",
    href: "/tools/ai-detector",
    icon: "ScanSearch",
    pack: "gratuit",
    access: "score_gratuit",
  },
  {
    id: "plagiarism",
    label: "Vérificateur de plagiat",
    description: "Estime le taux de contenu potentiellement plagié dans un texte.",
    href: "/tools/plagiarism",
    icon: "Shield",
    pack: "gratuit",
    access: "score_gratuit",
  },
  {
    id: "reformulator",
    label: "Reformulateur / Correcteur",
    description: "Reformule, corrige, simplifie ou académise un texte selon le ton voulu.",
    href: "/tools/reformulator",
    icon: "RefreshCw",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "email-writer",
    label: "Rédacteur d'email pro",
    description: "Génère un email professionnel complet à partir d'un contexte.",
    href: "/tools/email-writer",
    icon: "Mail",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "chat",
    label: "Chat IA",
    description: "Espace de conversation libre avec l'IA, borné par un quota de mots.",
    href: "/tools/chat",
    icon: "MessageSquare",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "social-posts",
    label: "Posts réseaux sociaux",
    description: "Génère des publications adaptées à chaque réseau social.",
    href: "/tools/social-posts",
    icon: "Share2",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "speech-writer",
    label: "Discours et pitchs",
    description: "Rédige un discours, un pitch commercial ou une préparation de soutenance.",
    href: "/tools/speech-writer",
    icon: "Mic",
    pack: "redaction",
    access: "des_goutte",
  },
  {
    id: "cv-writer",
    label: "Rédacteur de CV",
    description: "Construit un CV professionnel à partir de votre parcours.",
    href: "/tools/cv-writer",
    icon: "FileUser",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "cover-letter",
    label: "Lettre de motivation",
    description: "Génère une lettre de motivation adaptée au poste visé.",
    href: "/tools/cover-letter",
    icon: "FileHeart",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "plan-generator",
    label: "Générateur de plan",
    description: "Transforme un sujet en structure détaillée, avant rédaction complète.",
    href: "/tools/plan-generator",
    icon: "ListTree",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "pro-doc-writer",
    label: "Document professionnel",
    description: "Génère rapports, offres commerciales, business plans et études de cas.",
    href: "/tools/pro-doc-writer",
    icon: "Briefcase",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "academic-writer",
    label: "Document académique",
    description: "Rédige rapport de stage, mémoire ou thèse via un parcours guidé en 7 étapes.",
    href: "/tools/academic-writer",
    icon: "GraduationCap",
    pack: "documents",
    access: "des_goutte",
  },
];

export function toolsByPack(pack: ToolPack): Tool[] {
  return TOOLS.filter((tool) => tool.pack === pack);
}
