"use client";

import dynamic from "next/dynamic";
import { HighlightedText } from "@/components/tools/HighlightedText";

// pdf.js touche des API navigateur (Worker, DOMMatrix) absentes cote serveur — import
// dynamique obligatoire, ssr desactive.
const PdfViewer = dynamic(() => import("@/components/tools/PdfViewer").then((m) => m.PdfViewer), {
  ssr: false,
});

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// Affiche un fichier uploade avec les passages signales surlignes dessus. Seul le PDF a
// un rendu natif pagine (comme GPTZero) : un fichier Word n'a pas de "pages" au sens ou
// l'utilisateur le lit, donc DOCX/TXT/texte colle partagent tous le meme rendu en texte
// continu, sans mise en page façon Word — exactement comme GPTZero l'affiche pour un
// .docx (un editeur de texte, pas un lecteur de document pagine).
export function UploadedDocViewer({
  file,
  text,
  spans,
}: {
  file: File | null;
  text: string;
  spans: { start: number; end: number; ai_score?: number }[];
}) {
  if (file && extOf(file.name) === "pdf") {
    // Sans ai_score (plagiat), on garde l'ancien comportement : chaque span retenu par le
    // backend est deja une correspondance confirmee, toujours surlignee au maximum.
    const highlights = spans
      .map((s) => ({ text: text.slice(s.start, s.end), score: s.ai_score ?? 100 }))
      .filter((h) => h.text);
    return <PdfViewer file={file} highlights={highlights} />;
  }

  return (
    <div className="max-h-[720px] overflow-y-auto rounded-[12px] border bg-card p-4 text-sm">
      <HighlightedText text={text} spans={spans} />
    </div>
  );
}
