"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { DocBlock, GenerateDoneEvent, PartialGenerateEvent } from "@/types/document-engine";

type ErrorEvent = { code: string; message: string };

// Reponse HTTP initiale non-ok (402 quota, 403 modele indisponible, 500...) : le
// serveur a repondu, juste avec un statut d'echec — distinct d'une vraie coupure
// reseau (fetch qui echoue avant meme d'obtenir une reponse, ou connexion coupee en
// plein milieu du flux). Seule la seconde justifie une tentative de reconnexion.
class StructuredHttpError extends Error {}

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
  // Distingue une erreur RESEAU brute (connexion coupee, jamais d'evenement structure
  // du serveur — voir le catch tout en bas) d'une erreur STRUCTUREE (evenement SSE
  // "error" : le serveur a lui-meme conclu que rien n'etait recuperable, cf.
  // documents_engine.py). Seule la premiere justifie une tentative de reconnexion
  // automatique cote appelant (voir DocumentWorkspace.attemptReconnect) — retenter
  // sur une erreur deja explicitement tranchee par le serveur n'aurait aucun sens.
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  // Connu des le tout debut du flux (evenement "started"), bien avant done/partial —
  // une generation longue (3-4 min) peut voir sa connexion coupee (reseau,
  // redeploiement) sans qu'aucun autre evenement n'arrive jamais ; le serveur
  // continue pourtant de son cote (voir documents_engine.py _persist). Cet id permet
  // au frontend de recuperer le document par un simple GET plutot que de tout
  // reperdre et forcer une regeneration couteuse.
  const [documentId, setDocumentId] = useState<string | null>(null);
  // true des qu'un segment_done signale finish_reason="length" (troncature par
  // max_tokens) — ne redescend jamais a false en cours de flux, meme si un segment
  // suivant se termine normalement (une seule section coupee suffit a rendre le
  // document incomplet). Voir _SEGMENT_MAX_TOKENS/_FULL_DOC_MAX_TOKENS (documents_engine.py).
  const [truncated, setTruncated] = useState(false);
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
    setIsConnectionError(false);
    setProgress(null);
    setDocumentId(null);
    setTruncated(false);
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
        throw new StructuredHttpError(message);
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
            const p = parsed as unknown as StreamProgress & { truncated?: boolean };
            setProgress({ index: p.index, total: p.total });
            if (p.truncated) setTruncated(true);
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
        if (!(err instanceof StructuredHttpError)) setIsConnectionError(true);
      }
    } finally {
      setIsStreaming(false);
      controllerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return {
    blocks,
    isStreaming,
    error,
    isQuotaError,
    isConnectionError,
    progress,
    documentId,
    truncated,
    start,
    stop,
    setBlocks,
  };
}
