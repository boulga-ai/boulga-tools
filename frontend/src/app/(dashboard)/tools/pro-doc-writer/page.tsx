"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DocumentWorkspace } from "@/components/tools/DocumentWorkspace";
import { Button } from "@/components/ui/button";
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

const PRO_TEMPLATES = [
  { value: "pro_corporate", label: "Corporate", description: "En-tête Bleu Boulga, sommaire, pied de page confidentiel." },
  { value: "pro_minimal", label: "Minimal", description: "Sobre, sans couleurs, universel." },
];

const DOC_TYPES = [
  { value: "Rapport d'activité", label: "Rapport d'activité" },
  { value: "Note de service", label: "Note de service" },
  { value: "Compte-rendu", label: "Compte-rendu" },
  { value: "Proposition commerciale", label: "Proposition commerciale" },
  { value: "Business plan", label: "Business plan" },
  { value: "Étude de cas", label: "Étude de cas" },
  { value: "Analyse SWOT", label: "Analyse SWOT" },
  { value: "Cahier des charges", label: "Cahier des charges" },
];

const TONES = [
  { value: "Professionnel", label: "Professionnel" },
  { value: "Formel", label: "Formel" },
  { value: "Persuasif", label: "Persuasif" },
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

const TOOL = "pro_doc";
const SESSIONS_URL = `/api/v1/tools/generators/${TOOL}/sessions`;

type ProDocSession = {
  id: string;
  doc_type: string;
  title: string | null;
  status: string;
  work_state: Partial<WorkState> | null;
};

// Version allegee renvoyee par GET /sessions (liste, deja triee par updated_at) —
// sans work_state, trop lourd pour la liste de projets.
type SessionSummary = Omit<ProDocSession, "work_state"> & { updated_at: string };

export default function ProDocWriterPage() {
  const { profile } = useAuth();
  const available = profile ? profile.current_tier !== "introduction" : false;
  const pendingOutline = useToolStore((s) => s.pendingOutline);
  const setPendingOutline = useToolStore((s) => s.setPendingOutline);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ProDocSession | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  // Un timer de sauvegarde par session (pas un seul partage) : changer de projet
  // pendant qu'une sauvegarde est en attente ne doit jamais annuler celle d'un
  // AUTRE projet — sinon la derniere modification du projet quitte serait perdue.
  const saveTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!available) return;
    apiFetch(SESSIONS_URL).then((res) => {
      if (!res.ok) {
        setLoading(false);
        return;
      }
      res.json().then(async (list: SessionSummary[]) => {
        setSessions(list);
        const inProgress = list.find((s) => s.status === "in_progress");
        let active: ProDocSession | null = null;
        if (inProgress) {
          const detail = await apiFetch(`${SESSIONS_URL}/${inProgress.id}`);
          if (detail.ok) active = await detail.json();
        }
        if (!active) {
          const created = await apiFetch(SESSIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc_type: DOC_TYPES[0].value }),
          });
          if (created.ok) {
            active = await created.json();
            refreshSessions();
          }
        }

        // Plan valide venant du Generateur de plan ("Utiliser ce plan -> Document
        // pro") : fusionne dans le work_state et persiste immediatement.
        if (active && pendingOutline && pendingOutline.length > 0) {
          const mergedWorkState = { ...(active.work_state ?? {}), plan: outlineToPlan(pendingOutline) };
          const patched = await apiFetch(`${SESSIONS_URL}/${active.id}`, {
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
  }, [available]);

  async function refreshSessions() {
    const res = await apiFetch(SESSIONS_URL);
    if (res.ok) setSessions(await res.json());
  }

  async function switchToSession(id: string) {
    if (id === session?.id) return;
    const res = await apiFetch(`${SESSIONS_URL}/${id}`);
    if (res.ok) setSession(await res.json());
  }

  async function createNewProject() {
    const created = await apiFetch(SESSIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_type: DOC_TYPES[0].value }),
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
    const res = await apiFetch(`${SESSIONS_URL}/${session.id}`, {
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
        const res = await apiFetch(`${SESSIONS_URL}/${sessionId}`, {
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

  if (!available) {
    return (
      <ToolLayout
        title="Document professionnel"
        description="Décrivez le contenu, l'IA structure et vous propose — vous générez quand vous voulez."
        badge={
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Dès le palier Goutte
          </span>
        }
      >
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed p-12 text-center text-muted-foreground">
          <p>Cet outil nécessite un abonnement à partir du palier Goutte.</p>
          <a href="/settings">
            <Button variant="outline">Voir les paliers</Button>
          </a>
        </div>
      </ToolLayout>
    );
  }

  if (loading) {
    return (
      <ToolLayout title="Document professionnel" description="Chargement...">
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
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5 lg:px-6">
        <span className="font-medium">Document professionnel</span>
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
            docType="pro_doc"
            storageKey="boulga:workspace:pro_doc"
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
              { key: "doc_type", label: "Type de document", options: DOC_TYPES },
              { key: "title", label: "Titre (optionnel)" },
              { key: "tone", label: "Ton", options: TONES },
              { key: "competence", label: "Compétence", options: COMPETENCES },
              { key: "depth", label: "Niveau de détail", options: DEPTHS },
            ]}
            textareaLabel="Décrivez le contenu de votre document"
            textareaPlaceholder="Ex : Rapport d'activité annuel de mon entreprise de transport. Chiffre d'affaires de 50M FCFA, 15 employés, ouverture de 3 nouvelles lignes cette année..."
            templates={PRO_TEMPLATES}
            initialState={{
              ...(session?.work_state ?? { cadrage: { doc_type: DOC_TYPES[0].value } }),
              projectId: session?.id,
              projectName: session?.title ?? undefined,
            }}
            onStateChange={persistState}
            connections={
              <Link
                href="/tools/plan-generator"
                className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-bleu-boulga hover:underline"
              >
                Utiliser le Générateur de plan pour un plan plus détaillé →
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}
