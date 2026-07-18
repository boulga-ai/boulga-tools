"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";

// Fenetre de contexte (en caracteres, pas phrases exactes) envoyee autour du passage —
// une approximation simple de "2-3 phrases avant/apres" suffisante pour que le LLM garde
// la coherence stylistique, sans tokenizer de phrases cote frontend.
const CONTEXT_CHARS = 220;

type Span = { start: number; end: number };
type Replacement = { text: string; tone: string };

// Reecriture d'UN SEUL passage signale, en place, sans jamais modifier `text`/`spans`
// (la source de verite utilisee pour le scoring/export/surlignage) — seul le RENDU de ce
// passage change (voir HighlightedText). Chaque instance de HighlightedText a son propre
// hook, donc son propre etat local (cle = "start-end" DANS LE TEXTE QUI LUI EST PASSE,
// pas dans le document entier — suffisant : chaque instance de rendu a ses propres
// coordonnees locales coherentes).
export function usePassageRewrite() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [rewritingKey, setRewritingKey] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<Record<string, Replacement>>({});
  const [error, setError] = useState<string | null>(null);

  const spanKey = useCallback((span: Span) => `${span.start}-${span.end}`, []);

  const toggleOpen = useCallback(
    (span: Span) => {
      const key = spanKey(span);
      setOpenKey((prev) => (prev === key ? null : key));
    },
    [spanKey],
  );

  const undo = useCallback(
    (span: Span) => {
      const key = spanKey(span);
      setReplacements((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [spanKey],
  );

  const requestRewrite = useCallback(
    async (fullText: string, span: Span, tone: string) => {
      const key = spanKey(span);
      const passage = fullText.slice(span.start, span.end);
      const contextBefore = fullText.slice(Math.max(0, span.start - CONTEXT_CHARS), span.start);
      const contextAfter = fullText.slice(span.end, span.end + CONTEXT_CHARS);

      setError(null);
      setOpenKey(null);
      setRewritingKey(key);

      try {
        const res = await apiFetch("/api/v1/tools/analyzers/rewrite-passage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passage,
            context_before: contextBefore,
            context_after: contextAfter,
            tone,
          }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? "Réécriture impossible.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let rewritten = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            let eventType = "message";
            let data = "";
            for (const line of rawEvent.split("\n")) {
              if (line.startsWith("event:")) eventType = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (!data) continue;

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            if (eventType === "delta" && typeof parsed.text === "string") {
              rewritten += parsed.text;
            } else if (eventType === "error") {
              const message = typeof parsed.message === "string" ? parsed.message : null;
              throw new Error(message ?? "Réécriture impossible.");
            }
          }
        }

        if (!rewritten.trim()) throw new Error("Réécriture vide, réessayez.");
        setReplacements((prev) => ({ ...prev, [key]: { text: rewritten.trim(), tone } }));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setRewritingKey(null);
      }
    },
    [spanKey],
  );

  return { openKey, rewritingKey, replacements, error, spanKey, toggleOpen, undo, requestRewrite };
}
