// components/tools/SocialPosts.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Share2,
  Repeat,
  Trash2,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ChatMessage } from "@/components/tools/ChatMessage";
import { ChatInput } from "@/components/tools/ChatInput";
import { PlatformChips, PLATFORMS } from "@/components/tools/PlatformChips";
import { ToneChips } from "@/components/tools/ToneChips";
import { SocialPostCard } from "@/components/tools/SocialPostCard";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
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
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const DEFAULT_PLATFORM = "facebook";
const DEFAULT_TONE = "Convivial";
const REFINE_PRESETS = ["Plus court", "Plus percutant", "Ajoute des emojis"];
const SUGGESTIONS = [
  "Lancement de produit à Dakar",
  "Offre de stage en informatique",
  "Promo week-end restaurant",
];

type PostResult = {
  id: string;
  content: string;
  platform: string;
  tone: string;
  description: string;
};

type LastOutput = { content: string; description: string; platform: string; tone: string };

function tierBadge(tier: string | undefined): string | undefined {
  if (tier === "ocean" || tier === "fleuve") return "Expert ✦";
  if (tier === "source") return "Avancé";
  if (tier === "goutte") return "Pro";
  if (tier === "introduction") return "Standard";
  return undefined;
}

export default function SocialPostsPage() {
  const { profile } = useAuth();
  const badgeLabel = tierBadge(profile?.current_tier);
  const [platform, setPlatform] = useState(DEFAULT_PLATFORM);
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const [results, setResults] = useState<PostResult[]>([]);
  const [lastOutput, setLastOutput] = useState<LastOutput | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement>(null);
  const { text: output, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? "auto" : "smooth" });
  }, [results, isStreaming, output]);

  function buildPayload(overrides: {
    description: string;
    platform: string;
    tone: string;
    previousOutput?: string;
    refineInstruction?: string;
  }) {
    return {
      description: overrides.description,
      platform: overrides.platform,
      tone: overrides.tone,
      target_audience: audience || undefined,
      keywords: keywords || undefined,
      call_to_action: cta || undefined,
      previous_output: overrides.previousOutput,
      refine_instruction: overrides.refineInstruction,
    };
  }

  async function generate(
    payload: ReturnType<typeof buildPayload>,
    resultPlatform: string,
    resultTone: string,
    resultDescription: string,
  ) {
    let accumulated = "";
    await start("/api/v1/tools/transformers/social-posts", payload, {
      onDelta: (t) => {
        accumulated += t;
      },
    });
    setResults((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        content: accumulated,
        platform: resultPlatform,
        tone: resultTone,
        description: resultDescription,
      },
    ]);
    setLastOutput({
      content: accumulated,
      description: resultDescription,
      platform: resultPlatform,
      tone: resultTone,
    });
  }

  async function handleSend(text: string) {
    await generate(buildPayload({ description: text, platform, tone }), platform, tone, text);
  }

  async function handleRefinePreset(instruction: string) {
    if (!lastOutput || isStreaming) return;
    await generate(
      buildPayload({
        description: lastOutput.description,
        platform,
        tone,
        previousOutput: lastOutput.content,
        refineInstruction: instruction,
      }),
      platform,
      tone,
      lastOutput.description,
    );
  }

  async function handleRegenerate(item: PostResult) {
    await generate(
      buildPayload({ description: item.description, platform: item.platform, tone: item.tone }),
      item.platform,
      item.tone,
      item.description,
    );
  }

  async function handleAdapt(item: PostResult, newPlatform: string) {
    await generate(
      buildPayload({ description: item.description, platform: newPlatform, tone: item.tone }),
      newPlatform,
      item.tone,
      item.description,
    );
  }

  async function handleSave(item: PostResult) {
    if (savedIds.has(item.id)) return;
    try {
      const res = await apiFetch("/api/v1/tools/saved-generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "social_posts",
          content: item.content,
          metadata: { platform: item.platform, tone: item.tone },
        }),
      });
      if (!res.ok) throw new Error();
      setSavedIds((prev) => new Set(prev).add(item.id));
    } catch {
      toast.error("Impossible de sauvegarder ce post.");
    }
  }

  function handleDelete(id: string) {
    const next = results.filter((r) => r.id !== id);
    setResults(next);
    const newLast = next.length > 0 ? next[next.length - 1] : null;
    setLastOutput(newLast ? { ...newLast } : null);
  }

  function handleClearAll() {
    setResults([]);
    setLastOutput(null);
  }

  const lastResultId = results.length > 0 ? results[results.length - 1].id : undefined;

  return (
    <ToolLayout
      badge={
        profile?.current_tier === "introduction" || !profile ? (
          <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
            Gratuit
          </span>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* Colonne gauche — options, fixe (ne defile pas avec le fil) */}
        <div className="flex w-full flex-col gap-3 rounded-[12px] border bg-card p-4 lg:w-72 lg:shrink-0">
          <div className="flex flex-col gap-1.5">
            <Label>Plateforme</Label>
            <PlatformChips value={platform} onChange={setPlatform} disabled={isStreaming} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ton</Label>
            <ToneChips value={tone} onChange={setTone} disabled={isStreaming} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Que voulez-vous publier ?</Label>
            <ChatInput
              onSend={handleSend}
              value={description}
              onValueChange={setDescription}
              placeholder="Décrivez ce que vous voulez publier..."
              isStreaming={isStreaming}
              onStop={stop}
              className="static border-0 bg-transparent p-0 shadow-none"
              settingsSlot={
                <div className="flex flex-col gap-2">
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Audience cible (optionnel)"
                    disabled={isStreaming}
                  />
                  <Input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Hashtags ou mots-clés (optionnel)"
                    disabled={isStreaming}
                  />
                  <Input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Appel à l'action (optionnel)"
                    disabled={isStreaming}
                  />
                </div>
              }
            />
          </div>
          {error && <GenerationError message={error} isQuotaError={isQuotaError} />}
        </div>

        {/* Colonne droite — fil des posts generes, defile independamment */}
        <div className="flex min-h-0 flex-1 flex-col rounded-[12px] border bg-card">
          <div className="flex items-center justify-between border-b bg-gray-50/50 p-3.5">
            <span className="text-sm font-medium">Posts générés</span>
            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {results.length} post{results.length > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </div>

          <div ref={feedRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {results.length === 0 && !isStreaming ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <Share2 className="size-12 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  Décrivez ce que vous voulez publier à gauche, l&apos;IA génère un post adapté
                  à la plateforme choisie.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDescription(s)}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              results.map((item) => (
                <ChatMessage
                  key={item.id}
                  role="assistant"
                  badge={badgeLabel}
                  actions={
                    <>
                      <CopyButton
                        text={item.content}
                        label=""
                        copiedLabel=""
                        variant="outline"
                        size="icon-sm"
                        disabled={isStreaming}
                        aria-label="Copier"
                        title="Copier"
                      />
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleRegenerate(item)}
                        disabled={isStreaming}
                        aria-label="Régénérer"
                        title="Régénérer"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Select
                        value={undefined}
                        onValueChange={(value) =>
                          typeof value === "string" && handleAdapt(item, value)
                        }
                        disabled={isStreaming}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-fit gap-1 px-1.5"
                          aria-label="Adapter pour un autre réseau"
                          title="Adapter pour un autre réseau"
                        >
                          <Repeat className="size-3.5" />
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.filter((p) => p.value !== item.platform).map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              <p.icon className="size-4" />
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleSave(item)}
                        disabled={savedIds.has(item.id)}
                        aria-label={savedIds.has(item.id) ? "Sauvegardé" : "Sauvegarder"}
                        title={savedIds.has(item.id) ? "Sauvegardé" : "Sauvegarder"}
                      >
                        {savedIds.has(item.id) ? (
                          <BookmarkCheck className="size-3.5" />
                        ) : (
                          <Bookmark className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={isStreaming}
                        aria-label="Supprimer"
                        title="Supprimer"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  }
                >
                  <SocialPostCard content={item.content} platform={item.platform} />
                  {item.id === lastResultId && !isStreaming && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {REFINE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleRefinePreset(preset)}
                          className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </ChatMessage>
              ))
            )}
            {isStreaming && (
              <ChatMessage role="assistant" badge={badgeLabel} isStreaming>
                <SocialPostCard content={output} platform={platform} isStreaming />
              </ChatMessage>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
