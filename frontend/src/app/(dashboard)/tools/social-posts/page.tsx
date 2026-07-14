"use client";

import { useState } from "react";
import {
  Share2,
  RotateCcw,
  ChevronRight,
  Briefcase,
  ThumbsUp,
  X as XIcon,
  Camera,
  MessageCircle,
  Music2,
  Square,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { RefineBar } from "@/components/tools/RefineBar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStreaming } from "@/hooks/useStreaming";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: ThumbsUp },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "instagram", label: "Instagram", icon: Camera },
  { value: "linkedin", label: "LinkedIn", icon: Briefcase },
  { value: "twitter", label: "X (Twitter)", icon: XIcon },
  { value: "tiktok", label: "TikTok", icon: Music2 },
];

const TONES = [
  { value: "Convivial", label: "Convivial" },
  { value: "Professionnel", label: "Professionnel" },
  { value: "Inspirant", label: "Inspirant" },
  { value: "Humoristique", label: "Humoristique" },
  { value: "Informatif", label: "Informatif" },
  { value: "Promotionnel", label: "Promotionnel" },
];

export default function SocialPostsPage() {
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [tone, setTone] = useState("Convivial");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const { text: output, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const canSubmit = description.trim().length > 0;

  async function handleSubmit(overridePlatform?: string) {
    if (!canSubmit) return;
    await start("/api/v1/tools/transformers/social-posts", {
      description,
      platform: overridePlatform ?? platform,
      tone,
      target_audience: audience || undefined,
      keywords: keywords || undefined,
      call_to_action: cta || undefined,
    });
  }

  async function handleRefine(instruction: string) {
    if (!canSubmit) return;
    await start("/api/v1/tools/transformers/social-posts", {
      description,
      platform,
      tone,
      target_audience: audience || undefined,
      keywords: keywords || undefined,
      call_to_action: cta || undefined,
      previous_output: output,
      refine_instruction: instruction,
    });
  }

  return (
    <ToolLayout
      title="Posts réseaux sociaux"
      description="Génère des publications adaptées à chaque réseau social."
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Gratuit
        </span>
      }
    >
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Que voulez-vous publier ?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : On lance notre nouveau service de livraison à Ouagadougou, tarif spécial la première semaine..."
              className="min-h-28"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Plateforme</Label>
            <Select value={platform} onValueChange={(value) => value && setPlatform(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Plateforme" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <p.icon className="size-4" />
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ton</Label>
            <Select value={tone} onValueChange={(value) => value && setTone(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ton" />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className={cn("size-3.5 transition-transform", advancedOpen && "rotate-90")} />
              Options avancées
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audience">Audience cible (optionnel)</Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="étudiants, entrepreneurs, recruteurs..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="keywords">Hashtags ou mots-clés souhaités (optionnel)</Label>
                <Input
                  id="keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cta">Appel à l&apos;action souhaité (optionnel)</Label>
                <Input
                  id="cta"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Commentez, visitez notre site..."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-2">
            <Button onClick={() => handleSubmit()} disabled={isStreaming || !canSubmit} className="w-fit">
              <Share2 className="size-4" />
              {isStreaming ? "Génération en cours..." : "Générer le post"}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stop} className="w-fit">
                <Square className="size-4" />
                Arrêter
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <StreamingOutput text={output} isStreaming={isStreaming} />
          {output && (
            <p className="text-xs text-muted-foreground">
              {output.length.toLocaleString("fr-FR")} caractères
              {platform === "twitter" && output.length > 280 && (
                <span className="ml-1 text-attention">(dépasse la limite X/Twitter de 280)</span>
              )}
            </p>
          )}
          {error && <GenerationError message={error} isQuotaError={isQuotaError} onRetry={() => handleSubmit()} />}
          <div className="flex flex-wrap gap-2">
            <CopyButton text={output} disabled={isStreaming} />
            <Button variant="outline" onClick={() => handleSubmit()} disabled={isStreaming || !canSubmit}>
              <RotateCcw className="size-4" />
              Régénérer
            </Button>
            <Select
              value={undefined}
              onValueChange={(value) => typeof value === "string" && handleSubmit(value)}
              disabled={isStreaming || !canSubmit}
            >
              <SelectTrigger className="w-fit">
                <SelectValue placeholder="Adapter pour un autre réseau" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.filter((p) => p.value !== platform).map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <p.icon className="size-4" />
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {output && !isStreaming && (
            <RefineBar
              presets={["Plus court", "Plus long", "Plus percutant", "Ajoute des emojis"]}
              onRefine={handleRefine}
              disabled={isStreaming}
            />
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
