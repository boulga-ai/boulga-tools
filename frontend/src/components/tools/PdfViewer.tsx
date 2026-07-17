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
  const containerRef = useRef<HTMLDivElement>(null);

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
      className="flex max-h-[720px] flex-col items-center gap-3 overflow-y-auto rounded-[12px] border bg-muted/30 p-3"
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
              width={640}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
