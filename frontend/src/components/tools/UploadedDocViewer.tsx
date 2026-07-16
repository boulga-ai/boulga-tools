"use client";

import dynamic from "next/dynamic";
import { HighlightedText } from "@/components/tools/HighlightedText";

// pdf.js et docx-preview touchent des API navigateur (Worker, DOMMatrix, manipulation
// DOM directe) absentes cote serveur — import dynamique obligatoire, ssr desactive.
const PdfViewer = dynamic(() => import("@/components/tools/PdfViewer").then((m) => m.PdfViewer), {
  ssr: false,
});
const DocxViewer = dynamic(
  () => import("@/components/tools/DocxViewer").then((m) => m.DocxViewer),
  { ssr: false },
);

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// Affiche un fichier uploade dans son rendu natif (PDF pagine, DOCX pagine) avec les
// passages signales surlignes dessus. Repli sur le texte brut surligne existant pour
// une saisie collee ou un format sans rendu natif (.txt).
export function UploadedDocViewer({
  file,
  text,
  spans,
}: {
  file: File | null;
  text: string;
  spans: { start: number; end: number }[];
}) {
  const highlights = spans.map((s) => text.slice(s.start, s.end)).filter(Boolean);

  if (file) {
    const ext = extOf(file.name);
    if (ext === "pdf") return <PdfViewer file={file} highlights={highlights} />;
    if (ext === "docx") return <DocxViewer file={file} highlights={highlights} />;
  }

  return (
    <div className="rounded-[12px] border bg-card p-4 text-sm">
      <HighlightedText text={text} spans={spans} />
    </div>
  );
}
