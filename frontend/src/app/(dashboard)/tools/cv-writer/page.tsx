"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Download } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/tools/TagInput";
import { SuggestionsPanel, type AnalysisResult } from "@/components/tools/SuggestionsPanel";
import { TemplateSelector } from "@/components/tools/TemplateSelector";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { CVPreview } from "@/components/tools/DocumentPreview";
import { useAuth } from "@/hooks/useAuth";
import { useStreaming } from "@/hooks/useStreaming";
import { apiFetch } from "@/lib/api";
import { useToolStore } from "@/stores/toolStore";
import type { CVContent, Experience, Education, LanguageLevel } from "@/lib/document-types";

const CV_TEMPLATES = [
  { value: "cv_modern", label: "Moderne", description: "2 colonnes, accent Bleu Boulga." },
  { value: "cv_classic", label: "Classique", description: "1 colonne, sobre et universel." },
];

function emptyExperience(): Experience {
  return { title: "", company: "", start_date: "", description: "", achievements: [] };
}
function emptyEducation(): Education {
  return { degree: "", institution: "", year: "" };
}
function emptyLanguage(): LanguageLevel {
  return { language: "", level: "" };
}

export default function CVWriterPage() {
  const { user, profile } = useAuth();
  const setLastCV = useToolStore((s) => s.setLastCV);
  const [targetRole, setTargetRole] = useState("");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [summary, setSummary] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([emptyExperience()]);
  const [education, setEducation] = useState<Education[]>([emptyEducation()]);
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<LanguageLevel[]>([emptyLanguage()]);
  const [certifications, setCertifications] = useState<string[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [content, setContent] = useState<CVContent | null>(null);
  const { text: rawOutput, isStreaming, error, start } = useStreaming();

  const [template, setTemplate] = useState("cv_modern");
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);

  const available = profile ? profile.current_tier !== "introduction" : false;

  function formData() {
    return {
      target_role: targetRole,
      full_name: fullName,
      contact: { email, phone: phone || undefined, address: address || undefined, linkedin: linkedin || undefined },
      summary,
      experiences,
      education,
      skills,
      languages,
      certifications,
    };
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await apiFetch("/api/v1/tools/generators/cv/analyze", {
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
    await start("/api/v1/tools/generators/cv", formData(), {
      onDelta: (delta) => {
        generatedText += delta;
      },
      onDone: () => {
        try {
          const parsed = JSON.parse(generatedText);
          setContent(parsed);
          setLastCV(parsed);
        } catch {
          toast.error("Le CV genere n'a pas pu etre interprete. Reessayez.");
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
          doc_type: "cv",
          template,
          format,
          title: `CV - ${content.full_name}`,
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
      title="Redacteur de CV"
      description="Construit un CV professionnel a partir de votre parcours."
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
          <p>Le redacteur de CV necessite un abonnement a partir du palier Goutte.</p>
          <a href="/settings">
            <Button variant="outline">Voir les paliers</Button>
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Poste vise</Label>
              <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Comptable senior" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Telephone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Adresse (optionnel)</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>LinkedIn (optionnel)</Label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Resume (optionnel)</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-16" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Experiences</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExperiences((prev) => [...prev, emptyExperience()])}
              >
                <Plus className="size-3.5" /> Ajouter
              </Button>
            </div>
            {experiences.map((exp, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-[8px] border p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Intitule du poste"
                    value={exp.title}
                    onChange={(e) =>
                      setExperiences((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                  />
                  <Input
                    placeholder="Entreprise"
                    value={exp.company}
                    onChange={(e) =>
                      setExperiences((prev) => prev.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))
                    }
                  />
                  <Input
                    placeholder="Date de debut (ex: 2020)"
                    value={exp.start_date}
                    onChange={(e) =>
                      setExperiences((prev) => prev.map((x, j) => (j === i ? { ...x, start_date: e.target.value } : x)))
                    }
                  />
                  <Input
                    placeholder="Date de fin (vide = poste actuel)"
                    value={exp.end_date ?? ""}
                    onChange={(e) =>
                      setExperiences((prev) => prev.map((x, j) => (j === i ? { ...x, end_date: e.target.value } : x)))
                    }
                  />
                </div>
                <Textarea
                  placeholder="Description des missions"
                  value={exp.description}
                  onChange={(e) =>
                    setExperiences((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                  }
                  className="min-h-16"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExperiences((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-3.5" /> Retirer
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Formation</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEducation((prev) => [...prev, emptyEducation()])}
              >
                <Plus className="size-3.5" /> Ajouter
              </Button>
            </div>
            {education.map((edu, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-[8px] border p-3 sm:grid-cols-4">
                <Input
                  placeholder="Diplome"
                  value={edu.degree}
                  onChange={(e) => setEducation((prev) => prev.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))}
                />
                <Input
                  placeholder="Etablissement"
                  value={edu.institution}
                  onChange={(e) => setEducation((prev) => prev.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)))}
                />
                <Input
                  placeholder="Annee"
                  value={edu.year}
                  onChange={(e) => setEducation((prev) => prev.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setEducation((prev) => prev.filter((_, j) => j !== i))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Competences</Label>
              <TagInput tags={skills} onChange={setSkills} placeholder="Sage, Excel..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Certifications</Label>
              <TagInput tags={certifications} onChange={setCertifications} placeholder="DECF..." />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Langues</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLanguages((prev) => [...prev, emptyLanguage()])}>
                <Plus className="size-3.5" /> Ajouter
              </Button>
            </div>
            {languages.map((lang, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Langue"
                  value={lang.language}
                  onChange={(e) => setLanguages((prev) => prev.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)))}
                />
                <Input
                  placeholder="Niveau"
                  value={lang.level}
                  onChange={(e) => setLanguages((prev) => prev.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setLanguages((prev) => prev.filter((_, j) => j !== i))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              <Sparkles className="size-4" />
              {analyzing ? "Analyse en cours..." : "Analyser mes informations"}
            </Button>
            <Button onClick={handleGenerate} disabled={isStreaming || !fullName.trim()}>
              {isStreaming ? "Generation en cours..." : "Generer mon CV"}
            </Button>
          </div>

          {analysis && <SuggestionsPanel analysis={analysis} />}
          {error && <p className="text-sm text-erreur">{error}</p>}

          {(isStreaming || content) && (
            <div className="flex flex-col gap-4 border-t pt-6">
              <h3>Apercu</h3>
              {content ? (
                <CVPreview content={content} />
              ) : (
                <div className="min-h-32 whitespace-pre-wrap rounded-[12px] border bg-card p-4 text-xs text-muted-foreground">
                  {rawOutput}
                </div>
              )}

              {content && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <Label>Modele</Label>
                  <TemplateSelector options={CV_TEMPLATES} value={template} onChange={setTemplate} />
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
