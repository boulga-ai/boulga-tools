"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/tools/ChatInput";
import { CopyButton } from "@/components/tools/CopyButton";
import { GenerationError } from "@/components/tools/GenerationError";
import { MarkdownContent } from "@/components/tools/MarkdownContent";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStreaming } from "@/hooks/useStreaming";
import { useQuota } from "@/hooks/useQuota";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };
type ConversationSummary = { id: string; title: string; updated_at: string };

const HISTORY_COLLAPSE_KEY = "boulga:chat-history-collapsed";

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyCollapsed, setHistoryCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(HISTORY_COLLAPSE_KEY) === "1",
  );
  const { text, isStreaming, error, isQuotaError, start, stop, setText } = useStreaming();
  const { quota, refetch: refetchQuota } = useQuota();
  const scrollRef = useRef<HTMLDivElement>(null);

  function toggleHistory() {
    setHistoryCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(HISTORY_COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    apiFetch("/api/v1/tools/chat/conversations").then((res) => {
      if (res.ok) res.json().then(setConversations);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, text]);

  async function loadConversation(id: string) {
    const res = await apiFetch(`/api/v1/tools/chat/conversations/${id}`);
    if (!res.ok) return;
    const conversation = await res.json();
    setConversationId(id);
    setMessages(conversation.messages_json ?? []);
    setText("");
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setText("");
  }

  async function refreshConversations() {
    const res = await apiFetch("/api/v1/tools/chat/conversations");
    if (res.ok) setConversations(await res.json());
  }

  async function deleteConversation(id: string) {
    await apiFetch(`/api/v1/tools/chat/conversations/${id}`, { method: "DELETE" });
    if (conversationId === id) startNewConversation();
    refreshConversations();
  }

  async function sendMessage(message: string) {
    let assistantText = "";

    await start(
      "/api/v1/tools/transformers/chat",
      { message, conversation_id: conversationId },
      {
        onDelta: (delta) => {
          assistantText += delta;
        },
        onDone: (data) => {
          const payload = data as { conversation_id?: string };
          if (payload.conversation_id) setConversationId(payload.conversation_id);
          setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
          setText("");
        },
      },
    );
    refetchQuota();
    refreshConversations();
  }

  async function handleSend(message: string) {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    await sendMessage(message);
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && !isStreaming) sendMessage(lastUser.content);
  }

  const conversationList = (
    <div className="flex h-full w-60 shrink-0 flex-col gap-2 border-r bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Button variant="outline" onClick={startNewConversation} className="flex-1 justify-start">
          <Plus className="size-4" />
          Nouvelle conversation
        </Button>
        <button
          type="button"
          onClick={toggleHistory}
          title="Masquer l'historique"
          className="hidden size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground md:flex"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-[8px] px-2 py-1.5 text-sm hover:bg-accent",
              conversationId === c.id && "bg-blue-50 text-bleu-boulga",
            )}
          >
            <button
              onClick={() => loadConversation(c.id)}
              className="flex-1 truncate text-left"
              title={c.title}
            >
              {c.title || "Sans titre"}
            </button>
            <AlertDialog>
              <AlertDialogTrigger
                className="hidden shrink-0 rounded p-1 text-muted-foreground hover:text-erreur group-hover:block"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="size-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteConversation(c.id)}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {!historyCollapsed && <div className="hidden md:flex">{conversationList}</div>}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-card px-4 py-2 md:hidden">
          <Sheet>
            <SheetTrigger className="flex size-8 items-center justify-center rounded-[8px] hover:bg-accent">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Conversations</SheetTitle>
              {conversationList}
            </SheetContent>
          </Sheet>
          <span className="font-medium">Chat IA</span>
        </div>

        {historyCollapsed && (
          <div className="hidden border-b bg-card px-3 py-2 md:flex">
            <button
              type="button"
              onClick={toggleHistory}
              title="Afficher l'historique"
              className="flex size-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5">
            {messages.length === 0 && !isStreaming && (
              <div className="m-auto max-w-md text-center text-muted-foreground">
                <p className="text-foreground">Bonjour ! Je suis Boulga.</p>
                <p className="text-sm">Posez-moi une question pour commencer.</p>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-[12px] bg-blue-50 px-4 py-2.5 text-sm text-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="group flex w-full flex-col gap-1">
                  <MarkdownContent text={m.content} dense />
                  <CopyButton
                    text={m.content}
                    label="Copier"
                    variant="ghost"
                    size="sm"
                    className="hidden h-6 w-fit px-1.5 text-xs text-muted-foreground group-hover:flex"
                  />
                </div>
              ),
            )}

            {isStreaming && (
              <div className="w-full text-sm">
                <MarkdownContent text={text} dense />
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-bleu-boulga align-text-bottom" />
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-card p-3 md:p-4">
          {error && (
            <div className="mx-auto mb-2 max-w-3xl">
              <GenerationError message={error} isQuotaError={isQuotaError} onRetry={retryLast} />
            </div>
          )}
          <div className="mx-auto max-w-3xl">
            <ChatInput
              onSend={handleSend}
              placeholder="Écrivez votre message..."
              isStreaming={isStreaming}
              onStop={stop}
            />
          </div>
          {quota && (
            <p className="mx-auto mt-1.5 max-w-3xl text-xs text-muted-foreground">
              {quota.words_remaining.toLocaleString("fr-FR")} mots restants ce mois
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
