"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropZone({
  onFiles,
  multiple = false,
  accept,
  label = "Glissez-déposez un fichier, ou",
  accentDragClassName = "border-bleu-boulga bg-blue-50",
  accentTextClassName = "text-bleu-boulga",
}: {
  onFiles: (files: FileList) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  // Personnalisation de l'accent (bordure/fond au survol, couleur du lien) — utilise le
  // bleu Boulga par defaut, mais un outil peut passer sa propre couleur (ex. Convertisseur
  // avec une identite couleur par operation).
  accentDragClassName?: string;
  accentTextClassName?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed p-8 text-center transition-colors",
        dragging ? accentDragClassName : "border-border",
      )}
    >
      <UploadCloud className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {label}{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn("font-medium hover:underline", accentTextClassName)}
        >
          choisissez un fichier
        </button>
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
