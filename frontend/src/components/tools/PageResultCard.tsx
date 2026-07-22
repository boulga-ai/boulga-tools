"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Download, Expand, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DocumentRenderer } from "@/components/tools/DocumentRenderer";
import { FormatSelector } from "@/components/tools/FormatSelector";
import { ACCENT_PALETTE } from "@/lib/accent-palette";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DocBlock } from "@/types/document-engine";

// Carte "miniature de page" : boite a ratio A4 fixe, contenu recadre (overflow
// hidden) — montre le debut du document tel quel, jamais retreci pour tout faire
// tenir. Le document complet (aussi long soit-il) n'est consultable qu'en agrandi.
export function PageResultCard({
  documentId,
  title,
  blocks,
  template,
  accentColor,
  onAccentColorChange,
  onDelete,
}: {
  documentId: string | null;
  title: string;
  blocks: DocBlock[];
  template: string;
  // Undefined = couleur par defaut du template (voir lib/template-styles.ts). Vit
  // dans le ResultItem parent (pas un state local) pour survivre a la fermeture du
  // modal et au rechargement de la page (persiste avec le reste du projet).
  accentColor?: string;
  onAccentColorChange: (hex: string | undefined) => void;
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
        body: JSON.stringify({ template, format, title, accent_color: accentColor }),
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
            <DocumentRenderer blocks={blocks} template={template} accentColorOverride={accentColor} />
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
        {/* Le decoupage tete/corps/pied en 3 blocs (plutot qu'un seul conteneur
            scrollable) garantit que le titre et le bouton telecharger restent
            toujours visibles, et que seul le corps (le document) defile — sans ca,
            un document long fait defiler le pied avec, jusqu'a le faire sortir de
            vue. min-h-0 sur le corps est necessaire : sans lui, un enfant flex ne
            peut pas se retrecir sous la hauteur de son contenu et le defilement
            interne ne se declenche jamais (piege classique de flexbox). */}
        <DialogContent className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-0 p-0 sm:max-w-4xl">
          <DialogTitle className="shrink-0 px-4 pt-4">{title}</DialogTitle>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <DocumentRenderer blocks={blocks} template={template} accentColorOverride={accentColor} />
          </div>
          <div className="flex shrink-0 flex-col gap-3 border-t p-4">
            <div className="flex items-center gap-1.5">
              {ACCENT_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onAccentColorChange(accentColor === c.hex ? undefined : c.hex)}
                  aria-label={`Couleur ${c.label}`}
                  title={c.label}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full ring-offset-2 transition-shadow",
                    accentColor === c.hex && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: `#${c.hex}` }}
                >
                  {accentColor === c.hex && <Check className="size-3.5 text-white" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <FormatSelector value={format} onChange={setFormat} />
              <Button onClick={handleDownload} disabled={downloading || !documentId}>
                {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {downloading ? "Préparation..." : "Télécharger"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
