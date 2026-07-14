"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListTree, Send, Square } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OutlineTree } from "@/components/tools/OutlineTree";
import { useStreaming } from "@/hooks/useStreaming";
import { useToolStore } from "@/stores/toolStore";
import type { OutlineNode } from "@/lib/outline-tree";

const DOC_TYPES = [
  { value: "rapport_stage", label: "Rapport de stage" },
  { value: "memoire", label: "Mémoire" },
  { value: "these", label: "Thèse" },
  { value: "rapport", label: "Rapport d'activité" },
  { value: "note", label: "Note de service" },
  { value: "proposition", label: "Proposition commerciale" },
  { value: "business_plan", label: "Business plan" },
  { value: "etude_de_cas", label: "Étude de cas" },
  { value: "analyse_swot", label: "Analyse SWOT" },
  { value: "cahier_charges", label: "Cahier des charges" },
];

const DEPTHS = [
  { value: "essentiel", label: "Résumé (3-4 sections)" },
  { value: "detaille", label: "Standard (5-8 sections)" },
  { value: "tres_detaille", label: "Détaillé (8-12 sections)" },
];

export default function PlanGeneratorPage() {
  const router = useRouter();
  const setPendingOutline = useToolStore((s) => s.setPendingOutline);
  const [subject, setSubject] = useState("");
  const [docType, setDocType] = useState("rapport");
  const [depth, setDepth] = useState("detaille");
  const [tree, setTree] = useState<OutlineNode[] | null>(null);
  const { isStreaming, error, isQuotaError, start, stop } = useStreaming();

  async function handleGenerate() {
    if (!subject.trim()) return;
    let generatedText = "";
    setTree(null);
    await start(
      "/api/v1/tools/planner",
      { subject, doc_type: docType, depth },
      {
        onDelta: (delta) => {
          generatedText += delta;
        },
        onDone: () => {
          try {
            const parsed = JSON.parse(generatedText);
            setTree(parsed.sections ?? []);
          } catch {
            toast.error("Le plan généré n'a pas pu être interprété. Réessayez.");
          }
        },
      },
    );
  }

  function planAsText(nodes: OutlineNode[], depth = 0): string {
    return nodes
      .map((n) => `${"  ".repeat(depth)}- ${n.title}` + (n.children.length ? "\n" + planAsText(n.children, depth + 1) : ""))
      .join("\n");
  }

  function sendTo(destination: "pro-doc-writer" | "academic-writer") {
    if (!tree) return;
    setPendingOutline(tree);
    router.push(`/tools/${destination}`);
  }

  return (
    <ToolLayout
      title="Générateur de plan"
      description="Transforme un sujet en structure détaillée, avant rédaction complète."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Sujet</Label>
          <Textarea
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Décrivez le sujet ou le thème de votre document..."
            className="min-h-20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label>Profondeur</Label>
            <Select value={depth} onValueChange={(v) => v && setDepth(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPTHS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate} disabled={isStreaming || !subject.trim()} className="w-fit">
            <ListTree className="size-4" />
            {isStreaming ? "Génération en cours..." : "Générer le plan"}
          </Button>
          {isStreaming && (
            <Button variant="outline" onClick={stop} className="w-fit">
              <Square className="size-4" />
              Arrêter
            </Button>
          )}
        </div>
        {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={handleGenerate} />}

        {tree && (
          <div className="flex flex-col gap-3 border-t pt-6">
            <OutlineTree tree={tree} onChange={setTree} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleGenerate}>
                Régénérer le plan
              </Button>
              <CopyButton text={planAsText(tree)} label="Copier le plan" variant="outline" />
              <Button variant="outline" onClick={() => sendTo("pro-doc-writer")}>
                <Send className="size-4" /> Utiliser ce plan → Document professionnel
              </Button>
              <Button variant="outline" onClick={() => sendTo("academic-writer")}>
                <Send className="size-4" /> Utiliser ce plan → Document académique
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
