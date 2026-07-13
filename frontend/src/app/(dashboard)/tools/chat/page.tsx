"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Send, Trash2, Menu, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { text, isStreaming, start, stop, setText } = useStreaming();
  const { quota, refetch: refetchQuota } = useQuota();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  async function handleSend() {
    const message = input.trim();
    if (!message || isStreaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);

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

  const conversationList = (
    <div className="flex h-full w-60 shrink-0 flex-col gap-2 border-r bg-card p-3">
      <Button variant="outline" onClick={startNewConversation} className="w-full justify-start">
        <Plus className="size-4" />
        Nouvelle conversation
      </Button>
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
              <span className="block truncate">{c.title || "Sans titre"}</span>
              <span className="block text-xs text-muted-foreground">
                {relativeDate(c.updated_at)}
              </span>
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
                    Cette action est irreversible.
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
      <div className="hidden md:flex">{conversationList}</div>

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

        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          {messages.length === 0 && !isStreaming && (
            <div className="m-auto max-w-md text-center text-muted-foreground">
              <p className="text-foreground">
                Bonjour ! Je suis Boulga, votre assistant IA.
              </p>
              <p className="text-sm">Posez-moi une question pour commencer.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-[12px] px-4 py-2.5 text-sm",
                  m.role === "user" ? "bg-blue-50 text-foreground" : "bg-card border",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-[12px] border bg-card px-4 py-2.5 text-sm">
                {text}
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-bleu-boulga align-text-bottom" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-card p-3 md:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ecrivez votre message..."
              className="max-h-40 min-h-11 flex-1 resize-none"
            />
            {isStreaming ? (
              <Button variant="outline" onClick={stop}>
                <Square className="size-4" />
                Arreter
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!input.trim()}>
                <Send className="size-4" />
              </Button>
            )}
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
