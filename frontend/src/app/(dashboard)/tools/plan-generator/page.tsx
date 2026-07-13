"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListTree, Send, Copy } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
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
import { OutlineTree } from "@/components/tools/OutlineTree";
import { useStreaming } from "@/hooks/useStreaming";
import { useToolStore } from "@/stores/toolStore";
import type { OutlineNode } from "@/lib/outline-tree";

const DOC_TYPES = [
  { value: "rapport_stage", label: "Rapport de stage" },
  { value: "memoire", label: "Memoire" },
  { value: "these", label: "These" },
  { value: "rapport", label: "Rapport d'activite" },
  { value: "note", label: "Note de service" },
  { value: "proposition", label: "Proposition commerciale" },
  { value: "business_plan", label: "Business plan" },
  { value: "etude_de_cas", label: "Etude de cas" },
  { value: "analyse_swot", label: "Analyse SWOT" },
  { value: "cahier_charges", label: "Cahier des charges" },
];

const DEPTHS = [
  { value: "essentiel", label: "Essentiel" },
  { value: "detaille", label: "Detaille" },
  { value: "tres_detaille", label: "Tres detaille" },
];

export default function PlanGeneratorPage() {
  const router = useRouter();
  const setPendingOutline = useToolStore((s) => s.setPendingOutline);
  const [subject, setSubject] = useState("");
  const [docType, setDocType] = useState("rapport");
  const [depth, setDepth] = useState("detaille");
  const [tree, setTree] = useState<OutlineNode[] | null>(null);
  const { isStreaming, error, start } = useStreaming();

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
            toast.error("Le plan genere n'a pas pu etre interprete. Reessayez.");
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

  function handleCopy() {
    if (!tree) return;
    navigator.clipboard.writeText(planAsText(tree));
    toast.success("Plan copie");
  }

  function sendTo(destination: "pro-doc-writer" | "academic-writer") {
    if (!tree) return;
    setPendingOutline(tree);
    router.push(`/tools/${destination}`);
  }

  return (
    <ToolLayout
      title="Generateur de plan"
      description="Transforme un sujet en structure detaillee, avant redaction complete."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Sujet</Label>
          <Textarea value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-20" />
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

        <Button onClick={handleGenerate} disabled={isStreaming || !subject.trim()} className="w-fit">
          <ListTree className="size-4" />
          {isStreaming ? "Generation en cours..." : "Generer le plan"}
        </Button>
        {error && <p className="text-sm text-erreur">{error}</p>}

        {tree && (
          <div className="flex flex-col gap-3 border-t pt-6">
            <OutlineTree tree={tree} onChange={setTree} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerer tout
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="size-4" /> Copier le plan
              </Button>
              <Button variant="outline" onClick={() => sendTo("pro-doc-writer")}>
                <Send className="size-4" /> Envoyer vers le Redacteur de document pro
              </Button>
              <Button variant="outline" onClick={() => sendTo("academic-writer")}>
                <Send className="size-4" /> Envoyer vers le Redacteur academique
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
