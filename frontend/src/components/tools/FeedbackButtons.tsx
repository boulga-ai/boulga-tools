"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { apiFetch } from "@/lib/api";

// Pouce haut/bas minimal sur un resultat de scan (fichier uniquement, puisque le texte
// collé n'est jamais persisté — rien à référencer côté historique dans ce cas).
export function FeedbackButtons({
  endpoint,
  conversationId,
}: {
  endpoint: string;
  conversationId: string;
}) {
  const [sent, setSent] = useState<boolean | null>(null);

  async function vote(helpful: boolean) {
    setSent(helpful);
    try {
      await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, helpful }),
      });
    } catch {
      // best-effort ; ne bloque jamais l'affichage du resultat
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => vote(true)}
        title="Résultat utile"
        className={
          sent === true
            ? "rounded-[6px] border border-succes bg-succes/10 p-1.5 text-succes"
            : "rounded-[6px] border p-1.5 text-muted-foreground hover:bg-accent"
        }
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => vote(false)}
        title="Résultat pas utile"
        className={
          sent === false
            ? "rounded-[6px] border border-erreur bg-erreur/10 p-1.5 text-erreur"
            : "rounded-[6px] border p-1.5 text-muted-foreground hover:bg-accent"
        }
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
  );
}
