"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { Loader2 } from "lucide-react";
import { applyHighlights } from "@/lib/textMatch";

// Composant importe uniquement via next/dynamic({ ssr: false }) par les pages
// appelantes : docx-preview manipule le DOM directement, absent cote serveur.
export function DocxViewer({ file, highlights }: { file: File; highlights: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    setLoading(true);
    setError(null);
    el.innerHTML = "";

    renderAsync(file, el, undefined, { breakPages: true, ignoreWidth: false })
      .then(() => {
        if (!cancelled) applyHighlights(el, highlights);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible d'afficher ce document.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Reapplique si seule la liste de passages change (le rendu docx-preview existant
  // reste en place, pas besoin de tout regenerer).
  useEffect(() => {
    if (!loading && containerRef.current) applyHighlights(containerRef.current, highlights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights]);

  return (
    <div className="max-h-[600px] overflow-auto rounded-[12px] bg-muted/20 p-1">
      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="p-4 text-sm text-erreur">{error}</p>}
      <div ref={containerRef} className={loading ? "hidden" : undefined} />
    </div>
  );
}
