"use client";

import { useEffect, useRef, useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DocumentWorkspace } from "@/components/tools/DocumentWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { apiFetch } from "@/lib/api";
import { useToolStore } from "@/stores/toolStore";
import { cn } from "@/lib/utils";
import type { OutlineNode } from "@/lib/outline-tree";
import type { PlanItem, WorkState } from "@/types/document-engine";

function outlineToPlan(nodes: OutlineNode[]): PlanItem[] {
  return nodes.flatMap((n) => [{ heading: n.title, summary: "" }, ...outlineToPlan(n.children)]);
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

const ACADEMIC_TEMPLATES = [
  { value: "academic_formal", label: "Formel", description: "Page de garde, sommaire, numérotation, marges reliure." },
  { value: "academic_clean", label: "Épurée", description: "Page de garde simple, minimaliste." },
];

const TYPES = [
  { value: "rapport_stage", label: "Rapport de stage" },
  { value: "memoire", label: "Mémoire" },
  { value: "these", label: "Thèse" },
];

const DOMAINS = [
  { value: "Informatique", label: "Informatique" },
  { value: "Gestion", label: "Gestion" },
  { value: "Droit", label: "Droit" },
  { value: "Santé", label: "Santé" },
  { value: "Agronomie", label: "Agronomie" },
  { value: "Sciences sociales", label: "Sciences sociales" },
  { value: "Ingénierie", label: "Ingénierie" },
  { value: "Autre", label: "Autre" },
];

// Vocabulaire produit uniquement — jamais un nom de modèle affiché au user (voir
// backend/app/core/llm/router.py resolve_model, qui fait le lien en interne).
const COMPETENCES = [
  { value: "standard", label: "Standard" },
  { value: "expert", label: "Expert" },
];

const DEPTHS = [
  { value: "essentiel", label: "Essentiel" },
  { value: "detaille", label: "Détaillé" },
  { value: "tres_detaille", label: "Très détaillé" },
];

type AcademicSession = {
  id: string;
  doc_type: string;
  title: string | null;
  status: string;
  work_state: Partial<WorkState> | null;
};

// Version allegee renvoyee par GET /sessions (liste, deja triee par updated_at) —
// sans work_state, trop lourd pour la liste de projets.
type SessionSummary = Omit<AcademicSession, "work_state"> & { updated_at: string };

export default function AcademicWriterPage() {
  const { profile } = useAuth();
  // Introduction (essai gratuit) a desormais acces a l'outil lui-meme (voir
  // backend/app/core/llm/router.py) — seul le telechargement reste reserve a un
  // abonnement (quota downloads=0 en introduction, bloque nativement au moment du
  // rendu, voir DocumentWorkspace/PageResultCard.handleDownload). Meme logique que
  // cv-writer/cover-letter.
  const isIntroduction = profile?.current_tier === "introduction";
  const pendingOutline = useToolStore((s) => s.pendingOutline);
  const setPendingOutline = useToolStore((s) => s.setPendingOutline);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  // Un timer de sauvegarde par session (pas un seul partage) : changer de projet
  // pendant qu'une sauvegarde est en attente ne doit jamais annuler celle d'un
  // AUTRE projet — sinon la derniere modification du projet quitte serait perdue.
  const saveTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    apiFetch("/api/v1/tools/generators/academic/sessions").then((res) => {
      if (!res.ok) {
        setLoading(false);
        return;
      }
      res.json().then(async (list: SessionSummary[]) => {
        setSessions(list);
        const inProgress = list.find((s) => s.status === "in_progress");
        let active: AcademicSession | null = null;
        if (inProgress) {
          const detail = await apiFetch(`/api/v1/tools/generators/academic/sessions/${inProgress.id}`);
          if (detail.ok) active = await detail.json();
        }
        if (!active) {
          const created = await apiFetch("/api/v1/tools/generators/academic/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc_type: TYPES[0].value }),
          });
          if (created.ok) {
            active = await created.json();
            refreshSessions();
          }
        }

        // Plan valide venant du Generateur de plan ("Utiliser ce plan -> Document
        // academique") : fusionne dans le work_state et persiste immediatement.
        if (active && pendingOutline && pendingOutline.length > 0) {
          const mergedWorkState = { ...(active.work_state ?? {}), plan: outlineToPlan(pendingOutline) };
          const patched = await apiFetch(`/api/v1/tools/generators/academic/sessions/${active.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ work_state: mergedWorkState }),
          });
          if (patched.ok) active = await patched.json();
          setPendingOutline(null);
        }

        setSession(active);
        setLoading(false);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshSessions() {
    const res = await apiFetch("/api/v1/tools/generators/academic/sessions");
    if (res.ok) setSessions(await res.json());
  }

  async function switchToSession(id: string) {
    if (id === session?.id) return;
    const res = await apiFetch(`/api/v1/tools/generators/academic/sessions/${id}`);
    if (res.ok) setSession(await res.json());
  }

  async function createNewProject() {
    const created = await apiFetch("/api/v1/tools/generators/academic/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_type: TYPES[0].value }),
    });
    if (created.ok) {
      const active = await created.json();
      setSession(active);
      refreshSessions();
    }
  }

  // Renomme la session active (nom de projet, affiche dans le popover d'historique
  // des AUTRES sessions) — distinct de persistState : declenche immediatement, pas
  // debounce, puisque c'est une action explicite du user (clic + validation).
  async function renameActiveSession(title: string) {
    if (!session) return;
    const res = await apiFetch(`/api/v1/tools/generators/academic/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSession((current) => (current?.id === updated.id ? updated : current));
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, title: updated.title } : s)));
    }
  }

  function persistState(state: WorkState) {
    if (!session) return;
    const sessionId = session.id;
    const pending = saveTimeouts.current.get(sessionId);
    if (pending) clearTimeout(pending);
    saveTimeouts.current.set(
      sessionId,
      setTimeout(async () => {
        saveTimeouts.current.delete(sessionId);
        const res = await apiFetch(`/api/v1/tools/generators/academic/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            work_state: state,
            doc_type: state.cadrage.doc_type || session.doc_type,
            // projectName (nom stable du projet, auto-nomme ou renomme) prime sur
            // title (titre du DERNIER document genere, qui change a chaque carte) —
            // c'est projectName qui doit apparaitre dans le popover d'historique.
            title: state.projectName || state.title || undefined,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          // N'applique la reponse qu'a la session encore active : si le user a
          // deja bascule ailleurs, ne pas ecraser le projet courant.
          setSession((current) => (current?.id === sessionId ? updated : current));
          setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)));
        }
      }, 800),
    );
  }

  if (loading) {
    return (
      <ToolLayout title="Document académique" description="Chargement...">
        <div />
      </ToolLayout>
    );
  }

  // Le "projet" (nom + historique + bouton nouveau) vit desormais DANS
  // DocumentWorkspace (leftPanel), au meme endroit que cv/cover_letter — voir
  // projectsControl. La session DB existante (sessions/switchToSession/
  // createNewProject, deja en place) EST la source de cet historique ; plus de
  // sidebar/Sheet separee ici.
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-1.5 border-b bg-card px-4 py-2.5 lg:px-6">
        {isIntroduction && (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Essai gratuit — téléchargement dès le palier Goutte
          </span>
        )}
        <span className="font-medium">Document académique</span>
      </div>

      {/* En dessous de lg, DocumentWorkspace retombe sur un empilement simple a
          scroll de page normal — pas de hauteur bornee ici pour ne pas le clipper.
          min-h-0 partout dans cette chaine flex-col : sans ca, un enfant au
          contenu haut (le chat, le document genere) force sa hauteur au-dela de
          l'espace dispo (min-height:auto par defaut sur un flex item) et
          l'overflow remonte jusqu'a `main`, qui scrolle tout ensemble au lieu de
          laisser DocumentWorkspace gerer son propre scroll interne. */}
      <div
        className={cn(
          "min-h-0 p-4 lg:p-6",
          isDesktop ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto",
        )}
      >
        {/* Pas de max-w ici : un plafond fixe rendrait le redimensionnement des
            panels de DocumentWorkspace (et le fait de masquer la sidebar) sans
            effet des que le contenu atteint deja ce plafond — voir cv-writer. */}
        <div className={cn("h-full w-full", isDesktop && "min-h-0")}>
          <DocumentWorkspace
            key={session?.id ?? "new"}
            docType="academic"
            storageKey="boulga:workspace:academic"
            disableLocalStorage
            templateUpfront
            newDocumentLabel="Nouveau document"
            projectsControl={
              session
                ? {
                    activeName: session.title || "Sans titre",
                    onRenameActive: renameActiveSession,
                    history: sessions
                      .filter((s) => s.id !== session.id)
                      .map((s) => ({ id: s.id, name: s.title || "Sans titre", meta: relativeDate(s.updated_at) })),
                    onOpen: switchToSession,
                    onCreate: createNewProject,
                  }
                : undefined
            }
            cadrageFields={[
              { key: "doc_type", label: "Type de document", options: TYPES },
              { key: "domain", label: "Domaine", options: DOMAINS },
              { key: "competence", label: "Compétence", options: COMPETENCES },
              { key: "depth", label: "Niveau de détail", options: DEPTHS },
            ]}
            textareaLabel="Décrivez votre sujet et ce que vous savez déjà"
            textareaPlaceholder="Ex : Mon mémoire porte sur la transformation digitale des PME au Burkina Faso. J'étudie en master gestion à l'université de Ouagadougou. Mon encadreur est le Pr. Sawadogo..."
            templates={ACADEMIC_TEMPLATES}
            initialState={{
              ...(session?.work_state ?? { cadrage: { doc_type: TYPES[0].value } }),
              projectId: session?.id,
              projectName: session?.title ?? undefined,
            }}
            onStateChange={persistState}
          />
        </div>
      </div>
    </div>
  );
}
