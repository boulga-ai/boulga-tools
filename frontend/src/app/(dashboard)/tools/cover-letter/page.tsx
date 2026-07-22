"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Import, Sparkles } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DocumentWorkspace, type DocumentWorkspaceHandle } from "@/components/tools/DocumentWorkspace";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useToolStore } from "@/stores/toolStore";
import type { DocBlock } from "@/types/document-engine";

const LETTER_TEMPLATES = [
  { value: "letter_standard", label: "Standard", description: "Format lettre classique française." },
  { value: "letter_modern", label: "Moderne", description: "Bande colorée, entreprise moderne/startup." },
  { value: "letter_concours", label: "Concours / Fonction publique", description: "Structure imposée, ton institutionnel." },
  { value: "letter_academique", label: "Académique / Recherche", description: "Candidature recherche, doctorat, postdoc." },
];

// Vocabulaire produit uniquement — jamais un nom de modèle affiché au user. Pas de
// "depth" ici, comme pour le CV (voir cv-writer/page.tsx).
const COMPETENCES = [
  { value: "standard", label: "Standard" },
  { value: "expert", label: "Expert" },
];

const DISMISS_KEY = "boulga:cv-import-banner-dismissed";

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type CVChoice = { id: string; title: string; created_at: string };

export default function CoverLetterPage() {
  const { user, profile } = useAuth();
  const lastCVBlocks = useToolStore((s) => s.lastCVBlocks);
  const setLastCVBlocks = useToolStore((s) => s.setLastCVBlocks);
  const [importingCV, setImportingCV] = useState(false);
  const [cvAvailableFromBackend, setCvAvailableFromBackend] = useState(false);
  const cvAvailable = !!lastCVBlocks || cvAvailableFromBackend;
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "true";
  });
  const [cvChoices, setCvChoices] = useState<CVChoice[] | null>(null);
  const workspaceRef = useRef<DocumentWorkspaceHandle>(null);
  // Introduction (essai gratuit) a acces a l'outil ; seul le telechargement reste
  // reserve a un abonnement (voir cv-writer/page.tsx pour le detail).
  const isIntroduction = profile?.current_tier === "introduction";

  // Detecte simplement si un CV existe en base (le cas "en memoire" est deja couvert
  // par lastCVBlocks ci-dessus), sans rien injecter — le user choisit ensuite via le
  // bandeau ou le bouton "Importer".
  useEffect(() => {
    if (lastCVBlocks) return;
    apiFetch("/api/v1/documents/latest/cv").then((res) => setCvAvailableFromBackend(res.ok));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissBanner() {
    setBannerDismissed(true);
    if (typeof window !== "undefined") window.localStorage.setItem(DISMISS_KEY, "true");
  }

  function applyCVBlocks(blocks: DocBlock[]) {
    const contact = blocks.find((b) => b.type === "contact");
    const experiences = blocks.filter((b) => b.type === "experience").slice(0, 2);
    const skillGroups = blocks.filter((b) => b.type === "skill_group");

    const expText = experiences.map((e) => `${asStr(e.position)} chez ${asStr(e.company)}`).join(", ");
    const skillsText = skillGroups
      .flatMap((g) => (Array.isArray(g.skills) ? (g.skills as string[]) : []))
      .slice(0, 5)
      .join(", ");
    const relevant = [expText && `mon expérience (${expText})`, skillsText && `mes compétences en ${skillsText}`]
      .filter(Boolean)
      .join(" et ");

    workspaceRef.current?.mergeCadrage({
      full_name: contact ? asStr(contact.full_name) : "",
      email: contact ? asStr(contact.email) : "",
      target_role: contact ? asStr(contact.title) : "",
    });
    workspaceRef.current?.appendText(
      `D'après mon CV, voici ce qui semble pertinent pour ce poste : ${relevant || "mon parcours"}.`,
    );
    dismissBanner();
    setCvChoices(null);
  }

  async function loadCVById(id: string) {
    const res = await apiFetch(`/api/v1/documents/${id}`);
    if (!res.ok) {
      toast.error("CV introuvable.");
      return;
    }
    const doc = await res.json();
    const blocks = (doc.content_json?.blocks ?? []) as DocBlock[];
    setLastCVBlocks(blocks);
    applyCVBlocks(blocks);
    toast.success("Informations importées depuis votre CV");
  }

  async function importFromCV() {
    setImportingCV(true);
    try {
      if (lastCVBlocks) {
        applyCVBlocks(lastCVBlocks);
        toast.success("Informations importées depuis votre CV");
        return;
      }
      const res = await apiFetch("/api/v1/documents?tool=cv");
      if (!res.ok) {
        toast.error("Aucun CV trouvé. Créez d'abord un CV.");
        return;
      }
      const list: CVChoice[] = await res.json();
      if (list.length === 0) {
        toast.error("Aucun CV trouvé. Créez d'abord un CV.");
        return;
      }
      if (list.length === 1) {
        await loadCVById(list[0].id);
        return;
      }
      setCvChoices(list);
    } finally {
      setImportingCV(false);
    }
  }

  return (
    <ToolLayout
      title="Lettre de motivation"
      description="Décrivez votre motivation, l'IA rédige et vous propose d'affiner."
      badge={
        isIntroduction ? (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Essai gratuit — téléchargement dès le palier Goutte
          </span>
        ) : undefined
      }
    >
      <DocumentWorkspace
        ref={workspaceRef}
        docType="cover_letter"
        storageKey="boulga:workspace:cover_letter"
        templateConditionsContent
        beforeCadrage={
            <div className="flex flex-col gap-3">
              {cvAvailable && !bannerDismissed && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-bleu-boulga/30 bg-blue-50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="size-4 shrink-0 text-bleu-boulga" />
                    <span>Un CV récent a été trouvé. Utiliser ces informations pour pré-remplir ?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={importFromCV} disabled={importingCV}>
                      Utiliser
                    </Button>
                    <Button size="sm" variant="ghost" onClick={dismissBanner}>
                      Non merci
                    </Button>
                  </div>
                </div>
              )}
              <Button variant="outline" onClick={importFromCV} disabled={importingCV} className="w-fit">
                <Import className="size-4" />
                {importingCV ? "Import en cours..." : "Importer depuis mon CV"}
              </Button>
              {cvChoices && (
                <div className="flex flex-col gap-1.5 rounded-[10px] border p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Plusieurs CV trouvés — choisissez</p>
                  {cvChoices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => loadCVById(c.id)}
                      className="flex items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span className="truncate">{c.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
          cadrageFields={[
            { key: "target_role", label: "Poste visé" },
            { key: "company_name", label: "Entreprise" },
            { key: "full_name", label: "Nom complet" },
            { key: "email", label: "Email", type: "email" },
            { key: "competence", label: "Compétence", options: COMPETENCES },
          ]}
          textareaLabel="Pourquoi postulez-vous ?"
          textareaPlaceholder="Décrivez ce qui vous motive pour ce poste et cette entreprise, ce que vous pensez apporter, collez le texte de l'offre, ou joignez un fichier PDF/DOCX."
          templates={LETTER_TEMPLATES}
          initialState={{ cadrage: { full_name: profile?.full_name ?? "", email: user?.email ?? "" } }}
      />
    </ToolLayout>
  );
}
