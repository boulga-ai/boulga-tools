"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { DocBlock, GenerateDoneEvent, PartialGenerateEvent } from "@/types/document-engine";

type ErrorEvent = { code: string; message: string };

// Progression d'une generation segmentee (documents longs, academique/pro_doc — voir
// documents_engine.py) : index/total de segment en cours. Reste null pour toute
// generation non segmentee (cv/cover_letter, ou pro_doc/academic a plan court) —
// c'est ce null qui distingue "pas de progression a afficher" de "segment 1/1".
export type StreamProgress = { index: number; total: number };

export function useBlockStream() {
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  // Connu des le tout debut du flux (evenement "started"), bien avant done/partial —
  // une generation longue (3-4 min) peut voir sa connexion coupee (reseau,
  // redeploiement) sans qu'aucun autre evenement n'arrive jamais ; le serveur
  // continue pourtant de son cote (voir documents_engine.py _persist). Cet id permet
  // au frontend de recuperer le document par un simple GET plutot que de tout
  // reperdre et forcer une regeneration couteuse.
  const [documentId, setDocumentId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async (
    path: string,
    body: unknown,
    onDone?: (data: GenerateDoneEvent) => void,
    // Generation longue interrompue APRES qu'au moins un segment ait reussi — voir
    // PartialGenerateEvent. Distinct de onDone : le document est incomplet mais
    // deja sauvegarde, jamais confondu avec un succes ni avec l'erreur seche (qui
    // reste geree via le state `error` quand rien n'est recuperable).
    onPartial?: (data: PartialGenerateEvent) => void,
  ) => {
    setBlocks([]);
    setError(null);
    setIsQuotaError(false);
    setProgress(null);
    setDocumentId(null);
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

          if (eventType === "started") {
            setDocumentId((parsed as { document_id: string | null }).document_id);
          } else if (eventType === "block") {
            setBlocks((prev) => [...prev, parsed as DocBlock]);
          } else if (eventType === "segment_start" || eventType === "segment_done") {
            const p = parsed as unknown as StreamProgress;
            setProgress({ index: p.index, total: p.total });
          } else if (eventType === "done") {
            onDone?.(parsed as unknown as GenerateDoneEvent);
          } else if (eventType === "partial") {
            onPartial?.(parsed as unknown as PartialGenerateEvent);
          } else if (eventType === "error") {
            const errEvent = parsed as unknown as ErrorEvent;
            setError(errEvent.message || "Une erreur est survenue. Veuillez réessayer.");
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

  return { blocks, isStreaming, error, isQuotaError, progress, documentId, start, stop, setBlocks };
}
