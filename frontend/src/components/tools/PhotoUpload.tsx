"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// Photo (CV) ou logo/photo de couverture (document pro/academique) : uploadee vers
// le bucket Storage "uploads", jamais fournie au LLM (voir backend
// documents_engine.py upload-photo + DocEngineContext.photo_path). photoPath est ce
// qui doit survivre (envoye au backend a chaque generation, persiste dans cadrage) ;
// previewUrl est purement cosmetique (URL signee, pas garantie de rester valide tres
// longtemps) et n'est jamais renvoyee au backend.
export function PhotoUpload({
  label,
  photoPath,
  previewUrl,
  onChange,
}: {
  label: string;
  photoPath: string | undefined;
  previewUrl: string | undefined;
  onChange: (photoPath: string | undefined, previewUrl: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/v1/documents/upload-photo", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? "Envoi impossible.");
      const data = await res.json();
      setImageFailed(false);
      onChange(data.path, data.url);
    } catch (err) {
      toast.error("Envoi de la photo impossible", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {photoPath ? (
        <div className="flex items-center gap-2">
          {previewUrl && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL signee externe (Supabase Storage), pas un asset local
            <img
              src={previewUrl}
              alt=""
              className="size-10 shrink-0 rounded-[6px] object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Photo ajoutée</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(undefined, undefined)}
            title="Retirer"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <label
          className={cn(
            "flex w-fit cursor-pointer items-center gap-1.5 rounded-[8px] border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent",
            uploading && "pointer-events-none opacity-70",
          )}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {uploading ? "Envoi..." : "Ajouter une photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
