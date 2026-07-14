"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DocumentWorkspace } from "@/components/tools/DocumentWorkspace";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToolStore } from "@/stores/toolStore";

const CV_TEMPLATES = [
  { value: "cv_modern", label: "Moderne", description: "2 colonnes, accent Bleu Boulga." },
  { value: "cv_classic", label: "Classique", description: "1 colonne, sobre et universel." },
];

export default function CVWriterPage() {
  const { user, profile } = useAuth();
  const setLastCVBlocks = useToolStore((s) => s.setLastCVBlocks);
  const available = profile ? profile.current_tier !== "introduction" : false;

  return (
    <ToolLayout
      title="Rédacteur de CV"
      description="Décrivez votre parcours, l'IA structure et vous propose — vous générez quand vous voulez."
      badge={
        !available ? (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Dès le palier Goutte
          </span>
        ) : undefined
      }
    >
      {!available ? (
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed p-12 text-center text-muted-foreground">
          <p>Le rédacteur de CV nécessite un abonnement à partir du palier Goutte.</p>
          <a href="/settings">
            <Button variant="outline">Voir les paliers</Button>
          </a>
        </div>
      ) : (
        <DocumentWorkspace
          docType="cv"
          storageKey="boulga:workspace:cv"
          cadrageFields={[
            { key: "full_name", label: "Nom complet" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Téléphone", type: "tel" },
            { key: "target_role", label: "Poste visé", placeholder: "Comptable senior" },
          ]}
          textareaLabel="Décrivez votre parcours"
          textareaPlaceholder="Racontez votre expérience, vos études, vos compétences... Écrivez comme vous voulez ou collez un ancien CV. L'IA structurera tout."
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
      )}
    </ToolLayout>
  );
}
