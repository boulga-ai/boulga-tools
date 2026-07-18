"use client";

import dynamic from "next/dynamic";
import { HighlightedText } from "@/components/tools/HighlightedText";
import { highlightTier } from "@/lib/highlightTier";
import type { PdfHighlight } from "@/components/tools/PdfViewer";

// pdf.js touche des API navigateur (Worker, DOMMatrix) absentes cote serveur — import
// dynamique obligatoire, ssr desactive.
const PdfViewer = dynamic(() => import("@/components/tools/PdfViewer").then((m) => m.PdfViewer), {
  ssr: false,
});

type Span = { start: number; end: number; ai_score?: number };
type PageScore = { page: number; ai_score: number | null; too_short: boolean };

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function PagedHighlightedText({
  text,
  spans,
  pageRanges,
  pageScores,
  totalPages,
  label,
  rewriteConfig,
}: {
  text: string;
  spans: Span[];
  pageRanges: [number, number][];
  pageScores: PageScore[];
  totalPages: number;
  label: string;
  rewriteConfig?: { canRewrite: boolean };
}) {
  return (
    <div className="flex max-h-[720px] flex-col gap-4 overflow-y-auto rounded-[12px] border bg-card p-4">
      {pageRanges.map(([start, end], i) => {
        const score = pageScores[i] as PageScore | undefined;
        // Spans recadres sur cette page : on ne garde que ceux qui la recouvrent au
        // moins partiellement, et on retranche `start` pour que HighlightedText (qui
        // attend des offsets relatifs au texte qu'on lui passe, pas au document entier)
        // les positionne correctement dans le texte de CETTE page.
        const pageSpans = spans
          .filter((s) => s.start < end && s.end > start)
          .map((s) => ({
            ...s,
            start: Math.max(s.start, start) - start,
            end: Math.min(s.end, end) - start,
          }));

        return (
          <div key={i} id={`doc-page-${i + 1}`} className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>
                {label} {i + 1} / {totalPages}
              </span>
              {score && !score.too_short && score.ai_score !== null && (
                <span className={score.ai_score >= 50 ? "text-erreur" : "text-succes"}>
                  — {score.ai_score}% IA
                </span>
              )}
            </p>
            {score?.too_short ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Trop courte pour être analysée
              </p>
            ) : (
              <div className="rounded-lg border p-3 text-sm">
                <HighlightedText
                  text={text.slice(start, end)}
                  spans={pageSpans}
                  rewriteConfig={rewriteConfig}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Affiche un fichier uploade avec les passages signales surlignes dessus.
//
// PDF : rendu NATIF (pages visuelles du document original, comme GPTZero) avec
// surlignage par overlay coordonnees pixel-parfait sur la couche texte pdf.js — voir
// PdfViewer.tsx. C'est un retour en arriere assume sur le Prompt 2 ("texte extrait page
// par page"), juge comme un recul visuel par rapport a la reference GPTZero.
//
// DOCX/TXT/texte colle : pas de rendu natif pagine equivalent pour ces formats
// (asymetrie deliberee, cf. memoire projet) — restent sur le texte extrait surligne
// (HighlightedText/PagedHighlightedText). Meme repli si un PDF est affiche sans le
// fichier reellement disponible (ex. reouverture d'un historique dont le blob n'a pas pu
// etre re-telecharge) : pas de File, pas de rendu pdf.js possible.
export function UploadedDocViewer({
  file,
  text,
  spans,
  pageRanges,
  pageScores,
  totalPages,
  pagesExact = true,
  rewriteConfig,
}: {
  file: File | null;
  text: string;
  spans: Span[];
  pageRanges?: [number, number][];
  pageScores?: PageScore[];
  totalPages?: number;
  pagesExact?: boolean;
  rewriteConfig?: { canRewrite: boolean };
}) {
  if (file && extOf(file.name) === "pdf") {
    const highlights: PdfHighlight[] = spans
      .map((s) => {
        // Sans ai_score (plagiat), chaque span retenu par le backend est deja une
        // correspondance confirmee : toujours surlignee au maximum, comme avant.
        const tier = s.ai_score === undefined ? "strong" : highlightTier(s.ai_score);
        if (tier === null) return null;
        const quote = text.slice(s.start, s.end).trim();
        if (!quote) return null;
        return { quote, tier };
      })
      .filter((h): h is PdfHighlight => h !== null);

    return <PdfViewer file={file} highlights={highlights} pageScores={pageScores} />;
  }

  if (pageRanges && pageRanges.length > 0) {
    return (
      <PagedHighlightedText
        text={text}
        spans={spans}
        pageRanges={pageRanges}
        pageScores={pageScores ?? []}
        totalPages={totalPages ?? pageRanges.length}
        label={pagesExact ? "Page" : "Section"}
        rewriteConfig={rewriteConfig}
      />
    );
  }

  return (
    <div
      id="doc-page-1"
      className="max-h-[720px] overflow-y-auto rounded-[12px] border bg-card p-4 text-sm"
    >
      <HighlightedText text={text} spans={spans} rewriteConfig={rewriteConfig} />
    </div>
  );
}
