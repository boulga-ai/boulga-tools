"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";
import { buildFlexiblePattern } from "@/lib/textMatch";

// Charge le worker pdf.js depuis le bundle local (pas de CDN) — resolu par le bundler
// via import.meta.url, cf. doc react-pdf pour Next.js/Turbopack.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const CONTAINER_PADDING = 12; // p-1.5 des deux cotes (6px + 6px)
const DEFAULT_PAGE_WIDTH = 820;

// Memes teintes que highlightTier.ts (bg-attention/25 et /55), mais en rgba() directes :
// les overlays sont positionnes en pixels absolus par-dessus le canvas pdf.js, une classe
// Tailwind sur un <mark> n'a pas de sens ici (rien a "marquer" dans le DOM texte, qui
// reste invisible sous la couche texte pdf.js).
const TIER_BG: Record<"light" | "strong", string> = {
  light: "rgba(255, 165, 0, 0.25)",
  strong: "rgba(255, 140, 0, 0.4)",
};

export type PdfHighlight = { quote: string; tier: "light" | "strong" };
type PageScore = { page: number; ai_score: number | null; too_short: boolean };
type Rect = { left: number; top: number; width: number; height: number; tier: "light" | "strong" };

// Rendu PDF NATIF (comme GPTZero) avec surlignage par overlay coordonnees, pas par
// substitution de texte extrait (voir PromptAmelioration detection.md, prompt correctif
// "PDF natif avec surlignage overlay" — annule l'approche texte-extrait du Prompt 2 pour
// les PDF specifiquement ; DOCX/TXT/texte colle continuent de passer par HighlightedText,
// cf. UploadedDocViewer, qui n'a pas de rendu natif pagine equivalent).
//
// Principe : APRES que pdf.js a rendu sa propre couche texte (des <span> invisibles
// positionnes pixel-perfect par-dessus le canvas, pour la selection/copie de texte), on
// lit cette couche texte REELLEMENT RENDUE (pas l'API page.getTextContent() independante,
// qui peut legerement diverger de ce qui est effectivement affiche en presence de contenu
// "marque" - voir react-pdf/dist/Page/TextLayer.js) pour reconstituer le texte de la page
// et retrouver, pour chaque passage signale, quels <span> il recouvre. Le rectangle de
// surlignage de chaque <span> couvert est mesure directement via getBoundingClientRect()
// (relatif au conteneur de la page), donc toujours pixel-parfait avec ce qui est
// visuellement affiche, quel que soit le zoom/la largeur de rendu.
function PdfPageOverlay({
  pageNumber,
  width,
  highlights,
  pageScore,
}: {
  pageNumber: number;
  width: number;
  highlights: PdfHighlight[];
  pageScore?: PageScore;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Vrai des que pdf.js a rendu sa couche texte au moins une fois — avant ca, le <div>
  // conteneur existe deja (rendu synchrone) mais sans aucun <span> enfant, ce qui
  // ressemblerait sinon a tort a une page sans texte extractible (rendu asynchrone, cf.
  // react-pdf/dist/Page/TextLayer.js) pendant un bref instant a chaque montage.
  const hasRenderedOnceRef = useRef(false);
  const [rects, setRects] = useState<Rect[]>([]);
  const [textLayerEmpty, setTextLayerEmpty] = useState(false);

  // computeOverlays lit la couche texte DEJA RENDUE par pdf.js — elle ne se re-cree pas
  // toute seule quand `highlights` change (ex. un nouveau scan sur le meme fichier deja
  // affiche) puisque rien ne force pdf.js a re-rendre sa couche texte dans ce cas. Sans
  // cet effet, seul le premier calcul (declenche par onRenderTextLayerSuccess) aurait
  // lieu et les surlignages resteraient figes sur l'ancien resultat.
  const computeOverlays = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const textLayer = wrapper.querySelector<HTMLDivElement>(".react-pdf__Page__textContent");
    if (!textLayer) return;

    const spanEls = Array.from(textLayer.querySelectorAll<HTMLElement>('span[role="presentation"]'));

    // Reconstitue le texte de la page a partir des <span> reellement rendus, en
    // memorisant la plage [start, end) de chacun dans ce texte reconstitue — un espace
    // separe chaque span (la ponctuation exacte importe peu, buildFlexiblePattern
    // tolere les espaces/sauts de ligne de toute facon).
    let reconstructed = "";
    const ranges: { start: number; end: number; el: HTMLElement }[] = [];
    for (const el of spanEls) {
      const t = el.textContent ?? "";
      if (!t) continue;
      const start = reconstructed.length;
      reconstructed += `${t} `;
      ranges.push({ start, end: start + t.length, el });
    }

    // Page sans texte extractible (PDF scanne = image, ou page reellement blanche) :
    // aucun <span> exploitable, donc rien a surligner sur CETTE page — voir le message
    // de repli affiche sous la page.
    if (!reconstructed.trim()) {
      setTextLayerEmpty(true);
      setRects([]);
      return;
    }
    setTextLayerEmpty(false);

    const wrapperRect = wrapper.getBoundingClientRect();
    const nextRects: Rect[] = [];

    for (const { quote, tier } of highlights) {
      const pattern = buildFlexiblePattern(quote);
      if (!pattern) continue;
      const match = pattern.exec(reconstructed);
      if (!match) continue; // ce passage n'est pas sur CETTE page, rien d'anormal
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      for (const range of ranges) {
        if (range.start >= matchEnd || range.end <= matchStart) continue; // pas de recouvrement
        const elRect = range.el.getBoundingClientRect();
        nextRects.push({
          left: elRect.left - wrapperRect.left,
          top: elRect.top - wrapperRect.top,
          width: elRect.width,
          height: elRect.height,
          tier,
        });
      }
    }

    setRects(nextRects);
  }, [highlights]);

  const handleTextLayerReady = useCallback(() => {
    hasRenderedOnceRef.current = true;
    computeOverlays();
  }, [computeOverlays]);

  // Reapplique si la liste de passages signales change independamment d'un nouveau
  // rendu de la couche texte (voir commentaire sur computeOverlays ci-dessus) — mais pas
  // avant le tout premier rendu reel (voir hasRenderedOnceRef).
  useEffect(() => {
    if (!hasRenderedOnceRef.current) return;
    computeOverlays();
  }, [computeOverlays]);

  return (
    <div id={`doc-page-${pageNumber}`} className="flex flex-col items-center gap-1">
      <div className="flex w-full items-center justify-between px-0.5" style={{ maxWidth: width }}>
        <p className="text-[11px] text-muted-foreground">Page {pageNumber}</p>
        {pageScore && !pageScore.too_short && pageScore.ai_score !== null && (
          <span
            className={
              pageScore.ai_score >= 40
                ? "rounded-full bg-attention/15 px-2 py-0.5 text-[10px] font-medium text-attention"
                : "rounded-full bg-succes/15 px-2 py-0.5 text-[10px] font-medium text-succes"
            }
          >
            {pageScore.ai_score}% IA
          </span>
        )}
      </div>
      <div ref={wrapperRef} className="relative">
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          onRenderTextLayerSuccess={handleTextLayerReady}
          loading={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        />
        {/* pointer-events-none : les overlays ne doivent jamais bloquer la selection de
            texte / le scroll natif du PDF sous-jacent. */}
        <div className="pointer-events-none absolute inset-0">
          {rects.map((r, i) => (
            <div
              key={i}
              className="absolute rounded-[1px]"
              style={{ left: r.left, top: r.top, width: r.width, height: r.height, backgroundColor: TIER_BG[r.tier] }}
            />
          ))}
        </div>
      </div>
      {textLayerEmpty && highlights.length > 0 && (
        <p className="px-0.5 text-[11px] text-muted-foreground" style={{ maxWidth: width }}>
          Texte non détecté sur cette page (image ou contenu non extractible) — le
          surlignage n&apos;y est pas disponible. Les scores restent basés sur l&apos;analyse
          du texte extrait.
        </p>
      )}
    </div>
  );
}

// Composant importe uniquement via next/dynamic({ ssr: false }) par les pages
// appelantes : pdfjs-dist touche des API navigateur (Worker, DOMMatrix...) absentes
// cote serveur.
//
// Toutes les pages sont rendues empilees dans un conteneur scrollable (defilement
// vertical continu, comme un lecteur PDF classique / GPTZero).
export function PdfViewer({
  file,
  highlights,
  pageScores,
}: {
  file: File;
  highlights: PdfHighlight[];
  pageScores?: PageScore[];
}) {
  const [numPages, setNumPages] = useState(0);
  // Largeur mesuree du conteneur (pas une valeur fixe) : une colonne resserree
  // (ex. a cote du panneau de resultats) ne doit jamais faire deborder/couper la page
  // rendue — pdf.js a besoin d'un nombre de pixels explicite, pas d'un pourcentage CSS.
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const width = el.clientWidth - CONTAINER_PADDING;
      if (width > 0) setPageWidth(Math.min(width, DEFAULT_PAGE_WIDTH));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex max-h-[720px] w-full flex-col items-center gap-3 overflow-y-auto rounded-[12px] bg-muted/20 p-1.5"
    >
      <Document
        file={file}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <PdfPageOverlay
            key={i}
            pageNumber={i + 1}
            width={pageWidth}
            highlights={highlights}
            pageScore={pageScores?.find((p) => p.page === i + 1)}
          />
        ))}
      </Document>
    </div>
  );
}
