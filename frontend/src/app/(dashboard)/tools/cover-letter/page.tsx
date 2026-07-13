"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Download, Import } from "lucide-react";
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
import { CoverLetterPreview } from "@/components/tools/DocumentPreview";
import { useAuth } from "@/hooks/useAuth";
import { useStreaming } from "@/hooks/useStreaming";
import { apiFetch } from "@/lib/api";
import { useToolStore } from "@/stores/toolStore";
import type { CoverLetterContent } from "@/lib/document-types";

const LETTER_TEMPLATES = [
  { value: "letter_standard", label: "Standard", description: "Format lettre classique francaise." },
  { value: "letter_modern", label: "Moderne", description: "Bande marine, mise en page aeree." },
];

const TONES = ["Formel", "Professionnel", "Dynamique"];

export default function CoverLetterPage() {
  const { user, profile } = useAuth();
  const lastCV = useToolStore((s) => s.lastCV);

  const [targetRole, setTargetRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [background, setBackground] = useState("");
  const [motivation, setMotivation] = useState("");
  const [strengths, setStrengths] = useState("");
  const [tone, setTone] = useState("Professionnel");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [content, setContent] = useState<CoverLetterContent | null>(null);
  const { text: rawOutput, isStreaming, error, start } = useStreaming();

  const [template, setTemplate] = useState("letter_standard");
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);

  const available = profile ? profile.current_tier !== "introduction" : false;

  function importFromCV() {
    if (!lastCV) return;
    setFullName(lastCV.full_name);
    setEmail(lastCV.contact.email);
    setBackground(
      lastCV.experiences.map((exp) => `${exp.title} chez ${exp.company} : ${exp.description}`).join("\n"),
    );
    setStrengths(lastCV.skills.join(", "));
    toast.success("Informations importees depuis votre CV");
  }

  function formData() {
    return {
      target_role: targetRole,
      full_name: fullName,
      contact: { email },
      company_name: companyName,
      recipient_name: recipientName || undefined,
      background,
      motivation,
      strengths,
      tone,
    };
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await apiFetch("/api/v1/tools/generators/cover-letter/analyze", {
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
    await start("/api/v1/tools/generators/cover-letter", formData(), {
      onDelta: (delta) => {
        generatedText += delta;
      },
      onDone: () => {
        try {
          setContent(JSON.parse(generatedText));
        } catch {
          toast.error("La lettre generee n'a pas pu etre interpretee. Reessayez.");
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
          doc_type: "cover_letter",
          template,
          format,
          title: `Lettre de motivation - ${content.company_name}`,
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
      title="Lettre de motivation"
      description="Genere une lettre de motivation adaptee au poste vise."
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
          {lastCV && (
            <Button variant="outline" onClick={importFromCV} className="w-fit">
              <Import className="size-4" />
              Importer depuis mon CV
            </Button>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Poste vise</Label>
              <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Entreprise</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Recruteur (optionnel)</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
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
            <div className="flex flex-col gap-1.5">
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Parcours</Label>
            <Textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="Votre experience et vos competences pertinentes..."
              className="min-h-24"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Motivation</Label>
            <Textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Pourquoi ce poste, pourquoi cette entreprise..."
              className="min-h-20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Points forts</Label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="min-h-16"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              <Sparkles className="size-4" />
              {analyzing ? "Analyse en cours..." : "Analyser mes informations"}
            </Button>
            <Button onClick={handleGenerate} disabled={isStreaming || !fullName.trim() || !companyName.trim()}>
              {isStreaming ? "Generation en cours..." : "Generer la lettre"}
            </Button>
          </div>

          {analysis && <SuggestionsPanel analysis={analysis} />}
          {error && <p className="text-sm text-erreur">{error}</p>}

          {(isStreaming || content) && (
            <div className="flex flex-col gap-4 border-t pt-6">
              <h3>Apercu</h3>
              {content ? (
                <CoverLetterPreview content={content} />
              ) : (
                <div className="min-h-32 whitespace-pre-wrap rounded-[12px] border bg-card p-4 text-xs text-muted-foreground">
                  {rawOutput}
                </div>
              )}

              {content && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <Label>Modele</Label>
                  <TemplateSelector options={LETTER_TEMPLATES} value={template} onChange={setTemplate} />
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
