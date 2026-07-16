"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
export function PdfViewer({ file, highlights }: { file: File; highlights: string[] }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  function markCurrentPage() {
    if (containerRef.current) applyHighlights(containerRef.current, highlights);
  }

  // Reapplique si la liste de passages signales change independamment d'un nouveau
  // rendu de page (ex. un nouveau scan sur le meme fichier deja affiche).
  useEffect(() => {
    markCurrentPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights, pageNumber]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="max-h-[600px] overflow-auto rounded-[12px] border bg-muted/30 p-2">
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            onRenderTextLayerSuccess={markCurrentPage}
            renderAnnotationLayer={false}
            width={680}
          />
        </Document>
      </div>
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button
            variant="outline"
            size="icon"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground">
            Page {pageNumber} sur {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
