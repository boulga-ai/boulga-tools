"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  RotateCcw,
  Briefcase,
  ThumbsUp,
  X as XIcon,
  Camera,
  MessageCircle,
  Music2,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { StreamingOutput } from "@/components/tools/StreamingOutput";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStreaming } from "@/hooks/useStreaming";

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", icon: Briefcase },
  { value: "facebook", label: "Facebook", icon: ThumbsUp },
  { value: "twitter", label: "X (Twitter)", icon: XIcon },
  { value: "instagram", label: "Instagram", icon: Camera },
  { value: "whatsapp", label: "WhatsApp Status", icon: MessageCircle },
  { value: "tiktok", label: "TikTok", icon: Music2 },
];

const TONES = [
  { value: "Professionnel", label: "Professionnel" },
  { value: "Decontracte", label: "Decontracte" },
  { value: "Inspirant", label: "Inspirant" },
  { value: "Humoristique", label: "Humoristique" },
  { value: "Informatif", label: "Informatif" },
  { value: "Promotionnel", label: "Promotionnel" },
];

export default function SocialPostsPage() {
  const [subject, setSubject] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [tone, setTone] = useState("Professionnel");
  const [audience, setAudience] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [cta, setCta] = useState("");
  const { text: output, isStreaming, error, start } = useStreaming();

  const canSubmit = subject.trim() && audience.trim() && keyMessage.trim();

  async function handleSubmit(overridePlatform?: string) {
    if (!canSubmit) return;
    await start("/api/v1/tools/transformers/social-posts", {
      subject,
      platform: overridePlatform ?? platform,
      tone,
      target_audience: audience,
      key_message: keyMessage,
      call_to_action: cta || undefined,
    });
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success("Post copie");
  }

  return (
    <ToolLayout
      title="Posts reseaux sociaux"
      description="Genere des publications adaptees a chaque reseau social."
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Gratuit
        </span>
      }
    >
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Sujet / theme du post</Label>
            <Textarea
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Promotion, annonce, actualite..."
              className="min-h-20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Plateforme cible</Label>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audience">Audience cible</Label>
            <Input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="etudiants, entrepreneurs, recruteurs..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="keyMessage">Message cle</Label>
            <Textarea
              id="keyMessage"
              value={keyMessage}
              onChange={(e) => setKeyMessage(e.target.value)}
              placeholder="Le point principal a faire passer..."
              className="min-h-20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cta">Appel a l&apos;action (optionnel)</Label>
            <Input
              id="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Commentez, visitez notre site..."
            />
          </div>

          <Button onClick={() => handleSubmit()} disabled={isStreaming || !canSubmit} className="w-fit">
            <Share2 className="size-4" />
            {isStreaming ? "Generation en cours..." : "Generer le post"}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <StreamingOutput text={output} isStreaming={isStreaming} />
          {error && <p className="text-sm text-erreur">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={!output}>
              <Copy className="size-4" />
              Copier
            </Button>
            <Button variant="outline" onClick={() => handleSubmit()} disabled={isStreaming || !canSubmit}>
              <RotateCcw className="size-4" />
              Regenerer
            </Button>
            <Select
              value={undefined}
              onValueChange={(value) => value && handleSubmit(value)}
              disabled={isStreaming || !canSubmit}
            >
              <SelectTrigger className="w-fit">
                <SelectValue placeholder="Adapter pour un autre reseau" />
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
        </div>
      </div>
    </ToolLayout>
  );
}
