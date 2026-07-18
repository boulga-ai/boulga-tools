// components/tools/SocialPosts.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Bookmark, BookmarkCheck, Plus, Share2, Repeat, Trash2 } from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ChatMessage } from "@/components/tools/ChatMessage";
import { ChatInput } from "@/components/tools/ChatInput";
import { PlatformChips, PLATFORMS } from "@/components/tools/PlatformChips";
import { ToneChips } from "@/components/tools/ToneChips";
import { SocialPostCard } from "@/components/tools/SocialPostCard";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { Input } from "@/components/ui/input";
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

type ChatMsg =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
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
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [lastOutput, setLastOutput] = useState<LastOutput | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { text: output, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  const generationCount = messages.filter((m) => m.role === "assistant").length;

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? "auto" : "smooth" });
  }, [messages, isStreaming, output]);

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
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
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

  async function handleSend(userText: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: userText },
    ]);
    if (lastOutput) {
      await generate(
        buildPayload({
          description: lastOutput.description,
          platform,
          tone,
          previousOutput: lastOutput.content,
          refineInstruction: userText,
        }),
        platform,
        tone,
        lastOutput.description,
      );
    } else {
      await generate(buildPayload({ description: userText, platform, tone }), platform, tone, userText);
    }
  }

  async function handleRefinePreset(instruction: string) {
    if (!lastOutput) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: instruction },
    ]);
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

  async function handleRegenerate(msg: Extract<ChatMsg, { role: "assistant" }>) {
    await generate(
      buildPayload({ description: msg.description, platform: msg.platform, tone: msg.tone }),
      msg.platform,
      msg.tone,
      msg.description,
    );
  }

  async function handleAdapt(msg: Extract<ChatMsg, { role: "assistant" }>, newPlatform: string) {
    await generate(
      buildPayload({ description: msg.description, platform: newPlatform, tone: msg.tone }),
      newPlatform,
      msg.tone,
      msg.description,
    );
  }

  async function handleSave(msg: Extract<ChatMsg, { role: "assistant" }>) {
    if (savedIds.has(msg.id)) return;
    try {
      const res = await apiFetch("/api/v1/tools/saved-generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "social_posts",
          content: msg.content,
          metadata: { platform: msg.platform, tone: msg.tone },
        }),
      });
      if (!res.ok) throw new Error();
      setSavedIds((prev) => new Set(prev).add(msg.id));
    } catch {
      toast.error("Impossible de sauvegarder ce post.");
    }
  }

  function handleDelete(id: string) {
    const next = messages.filter((m) => m.id !== id);
    setMessages(next);
    const newLast = [...next].reverse().find((m) => m.role === "assistant");
    setLastOutput(
      newLast
        ? {
            content: newLast.content,
            description: newLast.description,
            platform: newLast.platform,
            tone: newLast.tone,
          }
        : null,
    );
  }

  function handleNewConversation() {
    setMessages([]);
    setLastOutput(null);
    setPlatform(DEFAULT_PLATFORM);
    setTone(DEFAULT_TONE);
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

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
      <div className="flex min-h-0 flex-1 flex-col rounded-[12px] border bg-card">
        <div className="flex flex-col gap-2.5 border-b bg-gray-50/50 p-3.5">
          {messages.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleNewConversation}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-bleu-boulga"
                title="Nouvelle conversation"
              >
                <Plus className="size-3.5" />
                Nouvelle conversation
              </button>
              {generationCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {generationCount} post{generationCount > 1 ? "s" : ""} généré
                  {generationCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
          <PlatformChips value={platform} onChange={setPlatform} disabled={isStreaming} />
          <ToneChips value={tone} onChange={setTone} disabled={isStreaming} />
        </div>

        <div ref={scrollAreaRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <Share2 className="size-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                Décrivez ce que vous voulez publier, l&apos;IA génère un post adapté à la
                plateforme choisie.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInputValue(s)}
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <ChatMessage key={m.id} role="user">
                  {m.content}
                </ChatMessage>
              ) : (
                <ChatMessage
                  key={m.id}
                  role="assistant"
                  badge={badgeLabel}
                  actions={
                    <>
                      <CopyButton
                        text={m.content}
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
                        onClick={() => handleRegenerate(m)}
                        disabled={isStreaming}
                        aria-label="Régénérer"
                        title="Régénérer"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Select
                        value={undefined}
                        onValueChange={(value) =>
                          typeof value === "string" && handleAdapt(m, value)
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
                          {PLATFORMS.filter((p) => p.value !== m.platform).map((p) => (
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
                        onClick={() => handleSave(m)}
                        disabled={savedIds.has(m.id)}
                        aria-label={savedIds.has(m.id) ? "Sauvegardé" : "Sauvegarder"}
                        title={savedIds.has(m.id) ? "Sauvegardé" : "Sauvegarder"}
                      >
                        {savedIds.has(m.id) ? (
                          <BookmarkCheck className="size-3.5" />
                        ) : (
                          <Bookmark className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(m.id)}
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
                  <SocialPostCard content={m.content} platform={m.platform} />
                  {m.id === lastAssistantId && !isStreaming && (
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
              ),
            )
          )}
          {isStreaming && (
            <ChatMessage role="assistant" badge={badgeLabel} isStreaming>
              <SocialPostCard content={output} platform={platform} isStreaming />
            </ChatMessage>
          )}
          {error && <GenerationError message={error} isQuotaError={isQuotaError} />}
        </div>

        <ChatInput
          onSend={handleSend}
          value={inputValue}
          onValueChange={setInputValue}
          placeholder="Décrivez ce que vous voulez publier..."
          isStreaming={isStreaming}
          onStop={stop}
          settingsSlot={
            <div className="flex flex-col gap-2">
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Audience cible (optionnel)"
              />
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Hashtags ou mots-clés (optionnel)"
              />
              <Input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Appel à l'action (optionnel)"
              />
            </div>
          }
        />
      </div>
    </ToolLayout>
  );
}
