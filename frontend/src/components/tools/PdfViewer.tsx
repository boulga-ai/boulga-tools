"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";
import { applyHighlights } from "@/lib/textMatch";

// Charge le worker pdf.js depuis le bundle local (pas de CDN) — resolu par le bundler
// via import.meta.url, cf. doc react-pdf pour Next.js/Turbopack.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const CONTAINER_PADDING = 24; // p-3 des deux cotes (12px + 12px)
const DEFAULT_PAGE_WIDTH = 640;

// Composant importe uniquement via next/dynamic({ ssr: false }) par les pages
// appelantes : pdfjs-dist touche des API navigateur (Worker, DOMMatrix...) absentes
// cote serveur.
//
// Toutes les pages sont rendues empilees dans un conteneur scrollable (defilement
// vertical continu, comme un lecteur PDF classique / GPTZero) plutot qu'une page a la
// fois avec navigation — le surlignage s'applique sur l'ensemble du conteneur, donc
// mark.js retrouve chaque citation quelle que soit la page ou elle se trouve.
export function PdfViewer({ file, highlights }: { file: File; highlights: string[] }) {
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

  function reapplyHighlights() {
    if (containerRef.current) applyHighlights(containerRef.current, highlights);
  }

  // Reapplique si la liste de passages signales change independamment d'un nouveau
  // rendu de page (ex. un nouveau scan sur le meme fichier deja affiche).
  useEffect(() => {
    reapplyHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights, numPages]);

  return (
    <div
      ref={containerRef}
      className="flex max-h-[720px] w-full flex-col items-center gap-3 overflow-y-auto rounded-[12px] border bg-muted/30 p-3"
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
          <div key={i} className="flex flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground">Page {i + 1}</p>
            <Page
              pageNumber={i + 1}
              onRenderTextLayerSuccess={reapplyHighlights}
              renderAnnotationLayer={false}
              width={pageWidth}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
