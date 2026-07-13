"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Download, Briefcase } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SuggestionsPanel, type AnalysisResult } from "@/components/tools/SuggestionsPanel";
import { TemplateSelector } from "@/components/tools/TemplateSelector";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { useAuth } from "@/hooks/useAuth";
import { useStreaming } from "@/hooks/useStreaming";
import { apiFetch } from "@/lib/api";
import { useToolStore } from "@/stores/toolStore";
import type { OutlineNode } from "@/lib/outline-tree";

const DOC_TYPES = [
  { value: "Rapport d'activite", label: "Rapport d'activite" },
  { value: "Note de service", label: "Note de service" },
  { value: "Compte-rendu", label: "Compte-rendu" },
  { value: "Proposition commerciale", label: "Proposition commerciale" },
  { value: "Business plan", label: "Business plan" },
  { value: "Etude de cas", label: "Etude de cas" },
  { value: "Analyse SWOT", label: "Analyse SWOT" },
  { value: "Cahier des charges", label: "Cahier des charges" },
];

const PRO_TEMPLATES = [
  { value: "pro_corporate", label: "Corporate", description: "En-tete Bleu Boulga, sommaire, pied de page confidentiel." },
  { value: "pro_minimal", label: "Minimal", description: "Sobre, sans couleurs, universel." },
];

const TONES = ["Professionnel", "Formel", "Persuasif"];

type PlanSection = { title: string; guidance: string };

function flattenOutline(nodes: OutlineNode[]): PlanSection[] {
  return nodes.flatMap((n) => [{ title: n.title, guidance: "" }, ...flattenOutline(n.children)]);
}

type ProSectionContent = { title: string; content: string; subsections: ProSectionContent[] };
type ProDocContent = {
  doc_type: string;
  title: string;
  author: string;
  organization?: string;
  date: string;
  sections: ProSectionContent[];
};

function renderSections(sections: ProSectionContent[], depth = 0): React.ReactNode {
  return sections.map((s, i) => (
    <div key={i} style={{ marginLeft: depth * 16 }} className="mb-2">
      <p className="font-medium">{s.title}</p>
      <p className="text-sm text-muted-foreground">{s.content}</p>
      {s.subsections.length > 0 && renderSections(s.subsections, depth + 1)}
    </div>
  ));
}

export default function ProDocWriterPage() {
  const { profile } = useAuth();
  const pendingOutline = useToolStore((s) => s.pendingOutline);
  const setPendingOutline = useToolStore((s) => s.setPendingOutline);

  const [docType, setDocType] = useState("Rapport d'activite");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState(profile?.full_name ?? "");
  const [organization, setOrganization] = useState("");
  const [sections, setSections] = useState<PlanSection[]>(() =>
    pendingOutline && pendingOutline.length > 0 ? flattenOutline(pendingOutline) : [{ title: "", guidance: "" }],
  );
  const [instructions, setInstructions] = useState("");
  const [tone, setTone] = useState("Professionnel");

  useEffect(() => {
    if (pendingOutline && pendingOutline.length > 0) {
      setPendingOutline(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [content, setContent] = useState<ProDocContent | null>(null);
  const { text: rawOutput, isStreaming, error, start } = useStreaming();

  const [template, setTemplate] = useState("pro_corporate");
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);

  const available = profile ? profile.current_tier !== "introduction" : false;

  function formData() {
    return {
      doc_type: docType,
      title,
      author,
      organization: organization || undefined,
      date: new Date().toLocaleDateString("fr-FR"),
      plan: sections,
      instructions: instructions || undefined,
      tone,
    };
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await apiFetch("/api/v1/tools/generators/pro-doc/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Analyse impossible.");
      setAnalysis(await res.json());
    } catch (err) {
      toast.error("Analyse impossible", { description: (err as Error).message });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate() {
    setContent(null);
    let generatedText = "";
    await start("/api/v1/tools/generators/pro-doc", formData(), {
      onDelta: (delta) => {
        generatedText += delta;
      },
      onDone: () => {
        try {
          setContent(JSON.parse(generatedText));
        } catch {
          toast.error("Le document genere n'a pas pu etre interprete. Reessayez.");
        }
      },
    });
  }

  async function handleDownload() {
    if (!content) return;
    setDownloading(true);
    try {
      const res = await apiFetch("/api/v1/documents/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_json: content,
          doc_type: "pro_doc",
          template,
          format,
          title: content.title,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Telechargement impossible.");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error("Telechargement impossible", { description: (err as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ToolLayout
      title="Document professionnel"
      description="Genere rapports, offres commerciales, business plans et etudes de cas."
      badge={
        !available ? (
          <span className="w-fit rounded-[4px] bg-blue-50 px-2 py-0.5 text-xs font-medium text-bleu-boulga">
            Des le palier Goutte
          </span>
        ) : undefined
      }
    >
      {!available ? (
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed p-12 text-center text-muted-foreground">
          <p>Cet outil necessite un abonnement a partir du palier Goutte.</p>
          <a href="/settings">
            <Button variant="outline">Voir les paliers</Button>
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Type de document</Label>
              <Select value={docType} onValueChange={(v) => v && setDocType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Auteur</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Organisation (optionnel)</Label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Plan</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSections((prev) => [...prev, { title: "", guidance: "" }])}
              >
                <Plus className="size-3.5" /> Ajouter une section
              </Button>
            </div>
            {sections.map((sec, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-[8px] border p-3">
                <Input
                  placeholder="Titre de la section"
                  value={sec.title}
                  onChange={(e) => setSections((prev) => prev.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))}
                />
                <Textarea
                  placeholder="Contenu de guidage pour l'IA (optionnel)"
                  value={sec.guidance}
                  onChange={(e) => setSections((prev) => prev.map((s, j) => (j === i ? { ...s, guidance: e.target.value } : s)))}
                  className="min-h-14"
                />
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSections((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5" /> Retirer
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Consignes particulieres (optionnel)</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-16" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              <Sparkles className="size-4" />
              {analyzing ? "Analyse en cours..." : "Analyser mes informations"}
            </Button>
            <Button onClick={handleGenerate} disabled={isStreaming || !title.trim()}>
              <Briefcase className="size-4" />
              {isStreaming ? "Generation en cours..." : "Generer le document"}
            </Button>
          </div>

          {analysis && <SuggestionsPanel analysis={analysis} />}
          {error && <p className="text-sm text-erreur">{error}</p>}

          {(isStreaming || content) && (
            <div className="flex flex-col gap-4 border-t pt-6">
              <h3>Apercu</h3>
              {content ? (
                <div className="rounded-[12px] border bg-card p-5 text-sm">
                  <h3 className="mb-3 text-marine">{content.title}</h3>
                  {renderSections(content.sections)}
                </div>
              ) : (
                <div className="min-h-32 whitespace-pre-wrap rounded-[12px] border bg-card p-4 text-xs text-muted-foreground">
                  {rawOutput}
                </div>
              )}

              {content && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <Label>Modele</Label>
                  <TemplateSelector options={PRO_TEMPLATES} value={template} onChange={setTemplate} />
                  <div className="flex items-center gap-3">
                    <FormatSelector value={format} onChange={setFormat} />
                    <Button onClick={handleDownload} disabled={downloading}>
                      <Download className="size-4" />
                      {downloading ? "Preparation..." : "Telecharger"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
