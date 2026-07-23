"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DocumentWorkspace } from "@/components/tools/DocumentWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToolStore } from "@/stores/toolStore";
import { cn } from "@/lib/utils";

const CV_TEMPLATES = [
  { value: "cv_modern", label: "Professionnel", description: "2 colonnes, candidature classique en entreprise." },
  { value: "cv_classic", label: "Étudiant / Scolaire", description: "1 colonne, stage/alternance/premier emploi." },
  { value: "cv_academique", label: "Académique / Universitaire", description: "Doctorat, recherche, enseignement." },
  { value: "cv_concours", label: "Concours / Administratif", description: "Fonction publique, concours administratifs." },
];

// Vocabulaire produit uniquement — jamais un nom de modèle affiché au user (voir
// backend/app/core/llm/router.py resolve_model). Pas de "depth" ici : un CV tient en
// 1-2 pages, cet axe n'a de sens que pour les documents longs (pro_doc/academic).
const COMPETENCES = [
  { value: "standard", label: "Standard" },
  { value: "expert", label: "Expert" },
];

export default function CVWriterPage() {
  const { user, profile } = useAuth();
  const setLastCVBlocks = useToolStore((s) => s.setLastCVBlocks);
  // Introduction (essai gratuit) a desormais acces a l'outil lui-meme (voir
  // backend/app/core/llm/router.py) — seul le telechargement reste reserve a un
  // abonnement (quota downloads=0 en introduction, bloque nativement au moment du
  // rendu, voir DocumentWorkspace.handleDownload).
  const isIntroduction = profile?.current_tier === "introduction";
  // Ne passe pas par ToolLayout (plafonne a max-w-5xl) : le chat+fil de cartes a
  // besoin de toute la largeur disponible, sans quoi le redimensionnement des
  // panels et le fait de masquer la sidebar principale ne changent jamais rien —
  // meme logique que Document professionnel/Academique.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-1.5 border-b bg-card px-4 py-3 lg:px-6">
        {isIntroduction && (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Essai gratuit — téléchargement dès le palier Goutte
          </span>
        )}
        <h1 className="text-lg font-semibold">Rédacteur de CV</h1>
        <p className="text-sm text-muted-foreground">
          Décrivez votre parcours, l&apos;IA structure et vous propose — vous générez quand vous voulez.
        </p>
      </div>

      {/* min-h-0 partout dans cette chaine flex-col : sans ca, un enfant au contenu
          haut (le chat, les cartes generees) force sa hauteur au-dela de l'espace
          dispo et l'overflow remonte jusqu'a `main`, qui scrollerait tout ensemble
          au lieu de laisser DocumentWorkspace gerer son propre scroll interne. */}
      <div className={cn("min-h-0 p-4 lg:p-6", isDesktop ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto")}>
        <div className={cn("h-full min-h-0 w-full", isDesktop && "h-full")}>
          <DocumentWorkspace
            docType="cv"
            storageKey="boulga:workspace:cv"
            templateConditionsContent
            newDocumentLabel="Nouveau CV"
            photoUpload
            photoLabel="Photo (optionnel)"
            cadrageFields={[
              { key: "full_name", label: "Nom complet" },
              { key: "email", label: "Email", type: "email" },
              { key: "phone", label: "Téléphone", type: "tel" },
              { key: "target_role", label: "Poste visé", placeholder: "Comptable senior" },
              { key: "competence", label: "Compétence", options: COMPETENCES },
            ]}
            textareaLabel="Décrivez votre parcours"
            textareaPlaceholder="Racontez votre expérience, vos études, vos compétences... Écrivez comme vous voulez, collez un ancien CV, ou joignez un fichier PDF/DOCX. L'IA structurera tout selon le modèle choisi."
            templates={CV_TEMPLATES}
            initialState={{ cadrage: { full_name: profile?.full_name ?? "", email: user?.email ?? "" } }}
            onStateChange={(state) => setLastCVBlocks(state.blocks.length > 0 ? state.blocks : null)}
            connections={
              <Link
                href="/tools/cover-letter"
                className="flex w-fit items-center gap-1 text-sm text-bleu-boulga hover:underline"
              >
                Rédiger une lettre de motivation pour ce poste
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
