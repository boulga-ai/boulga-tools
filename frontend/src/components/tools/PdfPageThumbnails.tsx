"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, RotateCw, X } from "lucide-react";

// Charge le worker pdf.js depuis le bundle local (pas de CDN), meme convention que
// components/tools/PdfViewer.tsx.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PageEntry = { id: string; pageNumber: number; rotate: number };
export type PageOperation = { page: number; rotate: number };

// Composant a importer uniquement via next/dynamic({ ssr: false }) — pdfjs-dist touche
// des API navigateur (Worker, DOMMatrix...) absentes cote serveur, meme raison que
// PdfViewer.tsx.
export function PdfPageThumbnails({
  file,
  onOperationsChange,
}: {
  file: File;
  onOperationsChange: (operations: PageOperation[]) => void;
}) {
  const [pages, setPages] = useState<PageEntry[]>([]);
  const dragIndex = useRef(-1);

  useEffect(() => {
    onOperationsChange(pages.map((p) => ({ page: p.pageNumber - 1, rotate: p.rotate })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  function handleLoadSuccess({ numPages }: { numPages: number }) {
    setPages(
      Array.from({ length: numPages }, (_, i) => ({
        id: crypto.randomUUID(),
        pageNumber: i + 1,
        rotate: 0,
      })),
    );
  }

  function rotatePage(id: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, rotate: (p.rotate + 90) % 360 } : p)));
  }

  function removePage(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }

  function reorder(from: number, to: number) {
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <Document
      file={file}
      onLoadSuccess={handleLoadSuccess}
      loading={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <div className="flex flex-wrap gap-3">
        {pages.map((entry, i) => (
          <div
            key={entry.id}
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex.current !== -1) reorder(dragIndex.current, i);
              dragIndex.current = -1;
            }}
            className="relative cursor-grab rounded-[8px] border bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => rotatePage(entry.id)}
              title="Pivoter"
              aria-label="Pivoter cette page"
              className="absolute right-1 top-1 z-10 flex size-6 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow hover:text-foreground"
            >
              <RotateCw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removePage(entry.id)}
              title="Supprimer cette page"
              aria-label="Supprimer cette page"
              className="absolute left-1 top-1 z-10 flex size-6 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
            <Page
              pageNumber={entry.pageNumber}
              rotate={entry.rotate}
              width={100}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              Page {entry.pageNumber}
            </p>
          </div>
        ))}
      </div>
    </Document>
  );
}
