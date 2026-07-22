"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Expand, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DocumentRenderer } from "@/components/tools/DocumentRenderer";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { apiFetch } from "@/lib/api";
import type { DocBlock } from "@/types/document-engine";

// Carte "miniature de page" : boite a ratio A4 fixe, contenu recadre (overflow
// hidden) — montre le debut du document tel quel, jamais retreci pour tout faire
// tenir. Le document complet (aussi long soit-il) n'est consultable qu'en agrandi.
export function PageResultCard({
  documentId,
  title,
  blocks,
  template,
  onDelete,
}: {
  documentId: string | null;
  title: string;
  blocks: DocBlock[];
  template: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"docx" | "pdf">("pdf");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!documentId) return;
    setDownloading(true);
    try {
      const res = await apiFetch(`/api/v1/documents/${documentId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, format, title }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Téléchargement impossible.");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error("Téléchargement impossible", { description: (err as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Pas de max-w ici : la carte doit suivre la largeur du panel (redimensionnable)
          pour que "étirer/rétrécir" ait un effet visible — sinon la carte reste figée
          a une taille fixe pendant que l'espace autour grandit pour rien. */}
      <div className="flex w-full flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Voir ${title}`}
          className="group relative aspect-[210/297] w-full overflow-hidden rounded-[10px] border bg-white text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden p-4">
            <DocumentRenderer blocks={blocks} template={template} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
          <div className="absolute inset-0 hidden items-center justify-center bg-black/5 group-hover:flex">
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow">
              <Expand className="size-3.5" />
              Agrandir
            </span>
          </div>
        </button>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDownload}
              disabled={downloading || !documentId}
              aria-label="Télécharger"
              title="Télécharger (PDF)"
              className="text-muted-foreground"
            >
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label="Supprimer"
              title="Supprimer"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto sm:max-w-4xl">
          <DialogTitle>{title}</DialogTitle>
          <DocumentRenderer blocks={blocks} template={template} />
          <div className="flex items-center gap-3 border-t pt-4">
            <FormatSelector value={format} onChange={setFormat} />
            <Button onClick={handleDownload} disabled={downloading || !documentId}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {downloading ? "Préparation..." : "Télécharger"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
