"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { highlightTier } from "@/lib/highlightTier";
import { usePassageRewrite } from "@/hooks/usePassageRewrite";

type Span = { start: number; end: number; ai_score?: number };

const TIER_CLASS = {
  light: "rounded-[2px] bg-attention/25 px-0.5",
  strong: "rounded-[2px] bg-attention/55 px-0.5",
};

const PRIMARY_TONES = [
  { value: "convivial", label: "Convivial" },
  { value: "academique", label: "Académique" },
  { value: "professionnel", label: "Pro" },
  { value: "neutre", label: "Neutre" },
];
const MORE_TONES = [
  { value: "persuasif", label: "Persuasif" },
  { value: "formel", label: "Formel" },
];

// Panneau de choix de ton affiche EN FLUX NORMAL juste apres le passage clique, pas en
// popover positionnee en absolu — plus robuste dans un conteneur scrollable (le viewer
// PDF pagine notamment) ou une position absolue mal ancree risquerait d'etre coupee ou
// mal placee.
function TonePicker({ canRewrite, onPick }: { canRewrite: boolean; onPick: (tone: string) => void }) {
  const [showMore, setShowMore] = useState(false);

  if (!canRewrite) {
    return (
      <span className="mx-1 inline-flex items-center gap-1.5 rounded-[8px] border bg-card px-2 py-1 align-middle text-xs text-muted-foreground">
        Réécriture disponible dès le palier Goutte
        <a href="/settings" className="font-medium text-bleu-boulga hover:underline">
          Voir les paliers
        </a>
      </span>
    );
  }

  return (
    <span className="mx-1 inline-flex flex-wrap items-center gap-1 rounded-[8px] border bg-card px-1.5 py-1 align-middle">
      <span className="px-1 text-xs text-muted-foreground">Réécrire :</span>
      {PRIMARY_TONES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onPick(t.value)}
          className="rounded-[6px] px-1.5 py-0.5 text-xs font-medium text-bleu-boulga hover:bg-blue-50"
        >
          {t.label}
        </button>
      ))}
      {showMore ? (
        MORE_TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onPick(t.value)}
            className="rounded-[6px] px-1.5 py-0.5 text-xs font-medium text-bleu-boulga hover:bg-blue-50"
          >
            {t.label}
          </button>
        ))
      ) : (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-bleu-boulga"
        >
          Voir tous les tons
        </button>
      )}
    </span>
  );
}

// Sans ai_score (plagiat : correspondances ponctuelles, pas de couverture exhaustive),
// chaque span garde l'intensite unique d'avant. Avec ai_score (detecteur IA : couverture
// phrase par phrase), l'intensite suit le score — rien sous le seuil "humain", plus
// marque a mesure qu'il monte, comme chez GPTZero.
//
// rewriteConfig (optionnel) rend chaque passage surligne cliquable (voir Prompt 6,
// PromptAmelioration detection.md) : le clic ouvre un choix de ton, la reecriture
// remplace VISUELLEMENT le passage (jamais `text`/`spans`, qui restent la source de
// verite du scoring/export/vocabulaire — cf. usePassageRewrite).
export function HighlightedText({
  text,
  spans,
  rewriteConfig,
}: {
  text: string;
  spans: Span[];
  rewriteConfig?: { canRewrite: boolean };
}) {
  const rewrite = usePassageRewrite();

  const sorted = [...spans]
    .map((span) => ({
      ...span,
      className:
        span.ai_score === undefined
          ? TIER_CLASS.strong
          : TIER_CLASS[highlightTier(span.ai_score) ?? "light"],
      skip: span.ai_score !== undefined && highlightTier(span.ai_score) === null,
    }))
    .filter((span) => !span.skip)
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((span, i) => {
    if (span.start > cursor) parts.push(text.slice(cursor, span.start));
    if (span.start < cursor) return; // chevauchement avec le span precedent, deja couvert

    if (!rewriteConfig) {
      parts.push(
        <mark key={i} className={span.className}>
          {text.slice(span.start, span.end)}
        </mark>,
      );
      cursor = Math.max(cursor, span.end);
      return;
    }

    const key = rewrite.spanKey(span);
    const replacement = rewrite.replacements[key];
    const isRewriting = rewrite.rewritingKey === key;
    const isOpen = rewrite.openKey === key;

    if (replacement) {
      parts.push(
        <mark key={i} className="rounded-[2px] bg-succes/25 px-0.5">
          {replacement.text}
          <button
            type="button"
            onClick={() => rewrite.undo(span)}
            title="Revenir au texte original"
            className="ml-1 inline-flex align-middle text-succes hover:text-erreur"
          >
            <X className="size-3" />
          </button>
        </mark>,
      );
    } else {
      parts.push(
        <mark
          key={i}
          role="button"
          tabIndex={0}
          onClick={() => rewrite.toggleOpen(span)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              rewrite.toggleOpen(span);
            }
          }}
          className={`${span.className} cursor-pointer transition-shadow hover:ring-1 hover:ring-bleu-boulga ${isOpen ? "ring-2 ring-bleu-boulga" : ""}`}
        >
          {text.slice(span.start, span.end)}
        </mark>,
      );
      if (isRewriting) {
        parts.push(
          <span
            key={`${i}-loading`}
            className="mx-1 inline-flex items-center gap-1 align-middle text-xs text-muted-foreground"
          >
            <Loader2 className="size-3 animate-spin" />
            Réécriture...
          </span>,
        );
      } else if (isOpen) {
        parts.push(
          <TonePicker
            key={`${i}-picker`}
            canRewrite={rewriteConfig.canRewrite}
            onPick={(tone) => rewrite.requestRewrite(text, span, tone)}
          />,
        );
      }
    }

    cursor = Math.max(cursor, span.end);
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  if (rewrite.error) {
    parts.push(
      <span key="rewrite-error" className="mx-1 inline-block align-middle text-xs text-erreur">
        {rewrite.error}
      </span>,
    );
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
