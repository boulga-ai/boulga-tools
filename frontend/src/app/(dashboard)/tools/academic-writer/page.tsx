"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  FileText,
  Briefcase,
  Sparkles,
  ListTree,
  Download,
  CheckCircle2,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { Stepper } from "@/components/tools/Stepper";
import { OutlineTree } from "@/components/tools/OutlineTree";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { TemplateSelector } from "@/components/tools/TemplateSelector";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useStreaming } from "@/hooks/useStreaming";
import { apiFetch } from "@/lib/api";
import type { OutlineNode } from "@/lib/outline-tree";

const STEP_LABELS = ["Type", "Domaine", "Sujet", "Plan", "Redaction", "Relecture", "Export"];

const DOMAINS = [
  "Informatique",
  "Gestion",
  "Droit",
  "Sante",
  "Agronomie",
  "Sciences sociales",
  "Ingenierie",
  "Autre",
];

const ACADEMIC_TEMPLATES = [
  { value: "academic_formal", label: "Formel", description: "Page de garde, sommaire, numerotation, marges reliure." },
  { value: "academic_clean", label: "Epure", description: "Page de garde simple, minimaliste." },
];

type SectionData = { content: string; status: string; summary: string | null; words: number };
type AcademicSession = {
  id: string;
  status: string;
  current_step: number;
  doc_type: "rapport_stage" | "memoire" | "these";
  domain: string | null;
  topic: string | null;
  outline_json: { sections: OutlineNode[] } | null;
  sections_json: Record<string, SectionData>;
};
type TopicSuggestion = { title: string; problematic: string; keywords: string[] };

function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((n) => [n, ...flattenOutline(n.children)]);
}

export default function AcademicWriterPage() {
  const { profile } = useAuth();
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [step, setStep] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    apiFetch("/api/v1/tools/generators/academic/sessions").then((res) => {
      if (!res.ok) return;
      res.json().then(async (sessions: { id: string; status: string }[]) => {
        const inProgress = sessions.find((s) => s.status === "in_progress");
        if (inProgress) {
          const detail = await apiFetch(`/api/v1/tools/generators/academic/sessions/${inProgress.id}`);
          if (detail.ok) {
            const data: AcademicSession = await detail.json();
            setSession(data);
            setStep(data.current_step);
          }
        }
        setLoadingInitial(false);
      });
    });
  }, []);

  async function patchSession(fields: Record<string, unknown>) {
    if (!session) return null;
    const res = await apiFetch(`/api/v1/tools/generators/academic/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      toast.error("Impossible d'enregistrer les modifications.");
      return null;
    }
    const updated: AcademicSession = await res.json();
    setSession(updated);
    return updated;
  }

  async function goToStep(next: number, fields?: Record<string, unknown>) {
    if (fields) {
      const updated = await patchSession({ ...fields, current_step: next });
      if (!updated) return;
    } else {
      await patchSession({ current_step: next });
    }
    setStep(next);
  }

  if (loadingInitial) {
    return (
      <ToolLayout title="Document academique" description="Chargement...">
        <div />
      </ToolLayout>
    );
  }

  return (
    <ToolLayout
      title="Document academique"
      description="Redige rapport de stage, memoire ou these via un parcours guide en 7 etapes."
    >
      <Stepper steps={STEP_LABELS} current={step} onStepClick={setStep} />

      <div className="pt-6">
        {step === 1 && (
          <Step1Type
            onSelect={async (docType) => {
              const res = await apiFetch("/api/v1/tools/generators/academic/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doc_type: docType }),
              });
              if (!res.ok) {
                toast.error("Impossible de creer la session.");
                return;
              }
              const created: AcademicSession = await res.json();
              setSession(created);
              await apiFetch(`/api/v1/tools/generators/academic/sessions/${created.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ current_step: 2 }),
              });
              setStep(2);
            }}
          />
        )}

        {step === 2 && session && (
          <Step2Domain
            initialDomain={session.domain ?? ""}
            onNext={(domain) => goToStep(3, { domain })}
          />
        )}

        {step === 3 && session && (
          <Step3Subject
            docType={session.doc_type}
            domain={session.domain ?? ""}
            initialTopic={session.topic ?? ""}
            onNext={(topic) => goToStep(4, { topic })}
          />
        )}

        {step === 4 && session && (
          <Step4Plan
            docType={session.doc_type}
            topic={session.topic ?? ""}
            initialTree={session.outline_json?.sections ?? null}
            onValidate={(tree) => goToStep(5, { outline_json: { sections: tree } })}
          />
        )}

        {step === 5 && session && session.outline_json && (
          <Step5Writing
            session={session}
            onSessionUpdate={setSession}
            onNext={() => goToStep(6)}
          />
        )}

        {step === 6 && session && session.outline_json && (
          <Step6Review session={session} onEditSection={() => setStep(5)} onNext={() => goToStep(7)} />
        )}

        {step === 7 && session && (
          <Step7Export session={session} authorDefault={profile?.full_name ?? ""} />
        )}
      </div>
    </ToolLayout>
  );
}

function Step1Type({ onSelect }: { onSelect: (docType: "rapport_stage" | "memoire" | "these") => void }) {
  const options: { value: "rapport_stage" | "memoire" | "these"; label: string; icon: typeof FileText }[] = [
    { value: "rapport_stage", label: "Rapport de stage", icon: FileText },
    { value: "memoire", label: "Memoire", icon: Briefcase },
    { value: "these", label: "These", icon: GraduationCap },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="flex flex-col items-center gap-3 rounded-[12px] border p-8 text-center transition-colors hover:border-bleu-boulga hover:bg-blue-50"
        >
          <opt.icon className="size-8 text-bleu-boulga" />
          <span className="font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function Step2Domain({ initialDomain, onNext }: { initialDomain: string; onNext: (domain: string) => void }) {
  const [domain, setDomain] = useState(initialDomain);
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Domaine d&apos;etude</Label>
        <Select value={domain} onValueChange={(v) => v && setDomain(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir un domaine" />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => onNext(domain)} disabled={!domain} className="w-fit">
        Suivant
      </Button>
    </div>
  );
}

function Step3Subject({
  docType,
  domain,
  initialTopic,
  onNext,
}: {
  docType: string;
  domain: string;
  initialTopic: string;
  onNext: (topic: string) => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function suggest() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/tools/generators/academic/suggest-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, doc_type: docType }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Suggestion impossible.");
      const data = await res.json();
      setSuggestions(data.topics);
    } catch (err) {
      toast.error("Suggestion impossible", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Sujet ou problematique</Label>
        <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} className="min-h-20" />
      </div>
      <Button variant="outline" onClick={suggest} disabled={loading} className="w-fit">
        <Sparkles className="size-4" />
        {loading ? "Recherche en cours..." : suggestions ? "Autres suggestions" : "Suggerer des sujets"}
      </Button>

      {suggestions && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setTopic(s.title)}
              className="flex flex-col gap-1 rounded-[8px] border p-3 text-left text-sm hover:border-bleu-boulga hover:bg-blue-50"
            >
              <span className="font-medium">{s.title}</span>
              <span className="text-muted-foreground">{s.problematic}</span>
              <span className="text-xs text-bleu-boulga">{s.keywords.join(", ")}</span>
            </button>
          ))}
        </div>
      )}

      <Button onClick={() => onNext(topic)} disabled={!topic.trim()} className="w-fit">
        Suivant
      </Button>
    </div>
  );
}

function Step4Plan({
  docType,
  topic,
  initialTree,
  onValidate,
}: {
  docType: string;
  topic: string;
  initialTree: OutlineNode[] | null;
  onValidate: (tree: OutlineNode[]) => void;
}) {
  const [tree, setTree] = useState<OutlineNode[] | null>(initialTree);
  const { isStreaming, error, start } = useStreaming();

  async function generate() {
    let generatedText = "";
    await start(
      "/api/v1/tools/generators/academic/generate-outline",
      { topic, domain: "", doc_type: docType },
      {
        onDelta: (delta) => {
          generatedText += delta;
        },
        onDone: () => {
          try {
            const parsed = JSON.parse(generatedText);
            setTree(parsed.sections ?? []);
          } catch {
            toast.error("Le plan genere n'a pas pu etre interprete. Reessayez.");
          }
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={generate} disabled={isStreaming} className="w-fit">
        <ListTree className="size-4" />
        {isStreaming ? "Generation en cours..." : tree ? "Regenerer le plan" : "Generer le plan"}
      </Button>
      {error && <p className="text-sm text-erreur">{error}</p>}
      {tree && (
        <>
          <OutlineTree tree={tree} onChange={setTree} />
          <Button onClick={() => onValidate(tree)} className="w-fit">
            Valider le plan
          </Button>
        </>
      )}
    </div>
  );
}

function Step5Writing({
  session,
  onSessionUpdate,
  onNext,
}: {
  session: AcademicSession;
  onSessionUpdate: (s: AcademicSession) => void;
  onNext: () => void;
}) {
  const flatSections = flattenOutline(session.outline_json?.sections ?? []);
  const [activeSection, setActiveSection] = useState<OutlineNode | null>(null);
  const [validating, setValidating] = useState(false);
  const { text, isStreaming, error, start } = useStreaming();

  const doneCount = flatSections.filter((s) => {
    const status = session.sections_json[s.id]?.status;
    return status === "genere" || status === "valide";
  }).length;

  async function generateSection(sectionId: string) {
    await start("/api/v1/tools/generators/academic/generate-section", {
      session_id: session.id,
      section_id: sectionId,
    });
    const res = await apiFetch(`/api/v1/tools/generators/academic/sessions/${session.id}`);
    if (res.ok) onSessionUpdate(await res.json());
  }

  async function validateSection(sectionId: string) {
    setValidating(true);
    try {
      const res = await apiFetch("/api/v1/tools/generators/academic/validate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id, section_id: sectionId }),
      });
      if (!res.ok) throw new Error("Validation impossible.");
      onSessionUpdate(await res.json());
      setActiveSection(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setValidating(false);
    }
  }

  const statusLabel: Record<string, { label: string; className: string }> = {
    genere: { label: "Genere", className: "bg-attention/15 text-attention" },
    valide: { label: "Valide", className: "bg-succes/15 text-succes" },
    a_revoir: { label: "A revoir", className: "bg-erreur/15 text-erreur" },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Progress value={(doneCount / Math.max(flatSections.length, 1)) * 100} className="flex-1" />
        <span className="text-sm text-muted-foreground">
          {doneCount}/{flatSections.length} sections
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {flatSections.map((section) => {
          const data = session.sections_json[section.id];
          const status = data?.status ?? "a_faire";
          const badge = statusLabel[status] ?? { label: "A faire", className: "bg-muted text-muted-foreground" };
          return (
            <div key={section.id} className="flex items-center gap-3 rounded-[8px] border bg-card p-3">
              <span className="flex-1 text-sm font-medium">{section.title}</span>
              <span className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
              {data?.words ? <span className="text-xs text-muted-foreground">{data.words} mots</span> : null}
              <Button size="sm" variant="outline" onClick={() => setActiveSection(section)}>
                {data?.content ? "Regenerer / Voir" : "Generer"}
              </Button>
            </div>
          );
        })}
      </div>

      <Button onClick={onNext} className="w-fit">
        Passer a la relecture
      </Button>

      <Dialog open={!!activeSection} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeSection?.title}</DialogTitle>
          </DialogHeader>
          {activeSection && (
            <div className="flex flex-col gap-3">
              {session.sections_json[activeSection.id]?.content && !isStreaming && !text ? (
                <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-[8px] border p-3 text-sm">
                  {session.sections_json[activeSection.id].content}
                </div>
              ) : (
                <StreamingOutput text={text} isStreaming={isStreaming} className="max-h-96 overflow-y-auto" />
              )}
              {error && <p className="text-sm text-erreur">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateSection(activeSection.id)}
                  disabled={isStreaming}
                >
                  {session.sections_json[activeSection.id]?.content ? "Regenerer" : "Generer"}
                </Button>
                {(session.sections_json[activeSection.id]?.content || text) && (
                  <Button onClick={() => validateSection(activeSection.id)} disabled={isStreaming || validating}>
                    Valider
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step6Review({
  session,
  onEditSection,
  onNext,
}: {
  session: AcademicSession;
  onEditSection: () => void;
  onNext: () => void;
}) {
  const flatSections = flattenOutline(session.outline_json?.sections ?? []);
  const totalWords = Object.values(session.sections_json).reduce((sum, s) => sum + (s.words || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{totalWords.toLocaleString("fr-FR")} mots au total</p>
      <div className="flex flex-col gap-4 rounded-[12px] border bg-card p-5">
        {flatSections.map((section) => (
          <button key={section.id} onClick={onEditSection} className="text-left">
            <h3 className="text-marine hover:text-bleu-boulga">{section.title}</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {session.sections_json[section.id]?.content || "(section non redigee)"}
            </p>
          </button>
        ))}
      </div>
      <Button onClick={onNext} className="w-fit">
        Passer a l&apos;export
      </Button>
    </div>
  );
}

function Step7Export({ session, authorDefault }: { session: AcademicSession; authorDefault: string }) {
  const [title, setTitle] = useState(session.topic ?? "");
  const [author, setAuthor] = useState(authorDefault);
  const [institution, setInstitution] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [template, setTemplate] = useState("academic_formal");
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const sections: Record<string, string> = {};
      for (const [id, data] of Object.entries(session.sections_json)) {
        sections[id] = data.content;
      }
      const content = {
        doc_type: session.doc_type,
        title,
        author,
        institution,
        supervisor: supervisor || undefined,
        year,
        outline: session.outline_json,
        sections,
      };
      const res = await apiFetch("/api/v1/documents/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_json: content, doc_type: "academic", template, format, title }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Telechargement impossible.");
      const data = await res.json();
      window.open(data.url, "_blank");
      setDone(true);
    } catch (err) {
      toast.error("Telechargement impossible", { description: (err as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[12px] border p-12 text-center">
        <CheckCircle2 className="size-8 text-succes" />
        <h3>Felicitations, votre document est pret !</h3>
        <p className="text-sm text-muted-foreground">Vous le retrouverez aussi dans Documents.</p>
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Auteur</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Etablissement</Label>
          <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Encadreur (optionnel)</Label>
          <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Annee</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>

      <Label>Modele</Label>
      <TemplateSelector options={ACADEMIC_TEMPLATES} value={template} onChange={setTemplate} />
      <div className="flex items-center gap-3">
        <FormatSelector value={format} onChange={setFormat} />
        <Button onClick={handleDownload} disabled={downloading || !title.trim() || !author.trim() || !institution.trim()}>
          <Download className="size-4" />
          {downloading ? "Preparation..." : "Telecharger mon document"}
        </Button>
      </div>
    </div>
  );
}
