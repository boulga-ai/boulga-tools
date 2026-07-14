"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type UsageEvent = { tokens_in: number; tokens_out: number; cost_usd: number };
type ErrorEvent = { code: string; message: string };

type SSEHandlers = {
  onDelta?: (text: string) => void;
  onUsage?: (usage: UsageEvent) => void;
  onDone?: (data: unknown) => void;
  onError?: (error: ErrorEvent) => void;
};

export function useStreaming() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async (path: string, body: unknown, handlers: SSEHandlers = {}) => {
    setText("");
    setError(null);
    setIsQuotaError(false);
    setIsStreaming(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const raw = await res.text().catch(() => "");
        let message = raw || `Erreur ${res.status}`;
        try {
          const data = JSON.parse(raw) as { detail?: unknown };
          if (typeof data.detail === "string") message = data.detail;
        } catch {
          // corps non-JSON : on garde le texte brut comme message
        }
        if (res.status === 402) setIsQuotaError(true);
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
            setText((prev) => prev + parsed.text);
            handlers.onDelta?.(parsed.text);
          } else if (eventType === "usage") {
            handlers.onUsage?.(parsed as unknown as UsageEvent);
          } else if (eventType === "done") {
            handlers.onDone?.(parsed);
          } else if (eventType === "error") {
            const errEvent = parsed as unknown as ErrorEvent;
            setError(errEvent.message || "Une erreur est survenue. Veuillez réessayer.");
            handlers.onError?.(errEvent);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setIsStreaming(false);
      controllerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { text, isStreaming, error, isQuotaError, start, stop, setText };
}
