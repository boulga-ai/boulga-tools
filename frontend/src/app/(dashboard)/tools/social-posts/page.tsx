// components/tools/SocialPosts.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Bookmark } from "lucide-react";
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

const REFINE_PRESETS = ["Plus court", "Plus percutant", "Ajoute des emojis"];

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

export default function SocialPostsPage() {
  const [platform, setPlatform] = useState("facebook");
  const [tone, setTone] = useState("Convivial");
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { text: output, isStreaming, error, isQuotaError, start, stop } = useStreaming();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
  }

  async function handleSend(userText: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: userText },
    ]);
    await generate(buildPayload({ description: userText, platform, tone }), platform, tone, userText);
  }

  function lastAssistantMessage() {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") return m;
    }
    return null;
  }

  async function handleRefine(instruction: string) {
    const last = lastAssistantMessage();
    if (!last) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: instruction },
    ]);
    await generate(
      buildPayload({
        description: last.description,
        platform: last.platform,
        tone: last.tone,
        previousOutput: last.content,
        refineInstruction: instruction,
      }),
      last.platform,
      last.tone,
      last.description,
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

  const lastAssistantId = lastAssistantMessage()?.id;

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
      <div className="flex flex-1 flex-col rounded-[12px] border bg-card">
        <div className="flex flex-col gap-2.5 border-b p-3.5">
          <h2>Posts réseaux sociaux</h2>
          <PlatformChips value={platform} onChange={setPlatform} disabled={isStreaming} />
          <ToneChips value={tone} onChange={setTone} disabled={isStreaming} />
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              Décrivez ce que vous voulez publier, l&apos;IA génère un post adapté à la
              plateforme choisie.
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
                  actions={
                    <>
                      <CopyButton text={m.content} variant="outline" size="sm" disabled={isStreaming} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(m)}
                        disabled={isStreaming}
                      >
                        <RotateCcw className="size-3.5" />
                        Régénérer
                      </Button>
                      <Select
                        value={undefined}
                        onValueChange={(value) =>
                          typeof value === "string" && handleAdapt(m, value)
                        }
                        disabled={isStreaming}
                      >
                        <SelectTrigger size="sm" className="w-fit text-xs">
                          <SelectValue placeholder="Adapter pour..." />
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
                      <Button variant="outline" size="sm" disabled>
                        <Bookmark className="size-3.5" />
                        Sauvegarder
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
                          onClick={() => handleRefine(preset)}
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
            <ChatMessage role="assistant" isStreaming>
              <SocialPostCard content={output} platform={platform} isStreaming />
            </ChatMessage>
          )}
          {error && <GenerationError message={error} isQuotaError={isQuotaError} />}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={handleSend}
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
