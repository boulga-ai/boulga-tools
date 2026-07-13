export type ToolPack = "gratuit" | "redaction" | "documents";

export type ToolAccess = "libre" | "gratuit_inscription" | "score_gratuit" | "des_goutte";

export type Tool = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string; // nom d'icone lucide-react
  pack: ToolPack;
  access: ToolAccess;
};

export const PACK_LABELS: Record<ToolPack, string> = {
  gratuit: "Outils gratuits",
  redaction: "Redaction",
  documents: "Documents avances",
};

export const ACCESS_BADGES: Record<ToolAccess, { label: string; className: string }> = {
  libre: {
    label: "Gratuit et illimite",
    className: "bg-succes/10 text-succes",
  },
  gratuit_inscription: {
    label: "Gratuit des l'inscription",
    className: "bg-succes/10 text-succes",
  },
  score_gratuit: {
    label: "Score gratuit",
    className: "bg-succes/10 text-succes",
  },
  des_goutte: {
    label: "Des le palier Goutte",
    className: "bg-blue-50 text-bleu-boulga",
  },
};

export const TOOLS: Tool[] = [
  {
    id: "converter",
    label: "Convertisseur de fichiers",
    description: "Convertit PDF, Word, Excel, PowerPoint et images, avec fusion et separation de PDF.",
    href: "/tools/converter",
    icon: "ArrowRightLeft",
    pack: "gratuit",
    access: "libre",
  },
  {
    id: "ai-detector",
    label: "Detecteur de contenu IA",
    description: "Estime la probabilite qu'un texte ait ete genere par une IA.",
    href: "/tools/ai-detector",
    icon: "ScanSearch",
    pack: "gratuit",
    access: "score_gratuit",
  },
  {
    id: "plagiarism",
    label: "Verificateur de plagiat",
    description: "Estime le taux de contenu potentiellement plagie dans un texte.",
    href: "/tools/plagiarism",
    icon: "Shield",
    pack: "gratuit",
    access: "score_gratuit",
  },
  {
    id: "reformulator",
    label: "Reformulateur / Correcteur",
    description: "Reformule, corrige, simplifie ou academise un texte selon le ton voulu.",
    href: "/tools/reformulator",
    icon: "RefreshCw",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "email-writer",
    label: "Redacteur d'email pro",
    description: "Genere un email professionnel complet a partir d'un contexte.",
    href: "/tools/email-writer",
    icon: "Mail",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "chat",
    label: "Chat IA",
    description: "Espace de conversation libre avec l'IA, borne par un quota de mots.",
    href: "/tools/chat",
    icon: "MessageSquare",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "social-posts",
    label: "Posts reseaux sociaux",
    description: "Genere des publications adaptees a chaque reseau social.",
    href: "/tools/social-posts",
    icon: "Share2",
    pack: "redaction",
    access: "gratuit_inscription",
  },
  {
    id: "speech-writer",
    label: "Discours et pitchs",
    description: "Redige un discours, un pitch commercial ou une preparation de soutenance.",
    href: "/tools/speech-writer",
    icon: "Mic",
    pack: "redaction",
    access: "des_goutte",
  },
  {
    id: "cv-writer",
    label: "Redacteur de CV",
    description: "Construit un CV professionnel a partir de votre parcours.",
    href: "/tools/cv-writer",
    icon: "FileUser",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "cover-letter",
    label: "Lettre de motivation",
    description: "Genere une lettre de motivation adaptee au poste vise.",
    href: "/tools/cover-letter",
    icon: "FileHeart",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "plan-generator",
    label: "Generateur de plan",
    description: "Transforme un sujet en structure detaillee, avant redaction complete.",
    href: "/tools/plan-generator",
    icon: "ListTree",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "pro-doc-writer",
    label: "Document professionnel",
    description: "Genere rapports, offres commerciales, business plans et etudes de cas.",
    href: "/tools/pro-doc-writer",
    icon: "Briefcase",
    pack: "documents",
    access: "des_goutte",
  },
  {
    id: "academic-writer",
    label: "Document academique",
    description: "Redige rapport de stage, memoire ou these via un parcours guide en 7 etapes.",
    href: "/tools/academic-writer",
    icon: "GraduationCap",
    pack: "documents",
    access: "des_goutte",
  },
];

export function toolsByPack(pack: ToolPack): Tool[] {
  return TOOLS.filter((tool) => tool.pack === pack);
}
