"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRightLeft,
  Merge,
  Scissors,
  FileText,
  Trash2,
  Loader2,
  GripVertical,
  Minimize2,
  Lock,
  Unlock,
  type LucideIcon,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { ConversionResultCard } from "@/components/tools/ConversionResultCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];
const OFFICE_TO_PDF: Record<string, string[]> = {
  docx: ["pdf"],
  doc: ["pdf"],
  odt: ["pdf"],
  rtf: ["pdf"],
  xlsx: ["pdf"],
  xls: ["pdf"],
  ods: ["pdf"],
  pptx: ["pdf"],
  ppt: ["pdf"],
  odp: ["pdf"],
};

function extOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Fil de resultats cumules persiste en sessionStorage, une cle par onglet — restaure au
// montage, sauvegarde a chaque changement. Les liens expirent avec le lien signe (24h),
// pas besoin de nettoyage particulier.
function useSessionResults<T>(key: string): [T[], Dispatch<SetStateAction<T[]>>] {
  const [state, setState] = useState<T[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota depasse ou sessionStorage indisponible : pas bloquant
    }
  }, [key, state]);

  return [state, setState];
}

function outputFormatsFor(filename: string): string[] {
  const ext = extOf(filename);
  if (IMAGE_EXTS.includes(ext)) {
    return [...IMAGE_EXTS.filter((e) => e !== ext), "pdf"];
  }
  if (ext === "pdf") {
    return ["docx", "xlsx", "pptx", "png"];
  }
  return OFFICE_TO_PDF[ext] ?? ["pdf"];
}

// Identite visuelle par outil — reprise partout (tuile d'accueil, page dediee, carte de
// resultat) pour qu'on reconnaisse immediatement quel outil on utilise, comme sur
// iLovePDF/Foxit ou chaque type d'operation a sa propre couleur.
const COLOR_STYLES = {
  blue: {
    tile: "bg-blue-50 hover:bg-blue-100/80",
    iconBg: "bg-blue-600",
    dropzoneDrag: "border-blue-600 bg-blue-50",
    text: "text-blue-600",
    cardAccent: "border-blue-600",
    buttonBg: "bg-blue-600 text-white hover:bg-blue-600/90",
  },
  green: {
    tile: "bg-green-50 hover:bg-green-100/80",
    iconBg: "bg-green-600",
    dropzoneDrag: "border-green-600 bg-green-50",
    text: "text-green-600",
    cardAccent: "border-green-600",
    buttonBg: "bg-green-600 text-white hover:bg-green-600/90",
  },
  orange: {
    tile: "bg-orange-50 hover:bg-orange-100/80",
    iconBg: "bg-orange-600",
    dropzoneDrag: "border-orange-600 bg-orange-50",
    text: "text-orange-600",
    cardAccent: "border-orange-600",
    buttonBg: "bg-orange-600 text-white hover:bg-orange-600/90",
  },
  purple: {
    tile: "bg-purple-50 hover:bg-purple-100/80",
    iconBg: "bg-purple-600",
    dropzoneDrag: "border-purple-600 bg-purple-50",
    text: "text-purple-600",
    cardAccent: "border-purple-600",
    buttonBg: "bg-purple-600 text-white hover:bg-purple-600/90",
  },
  indigo: {
    tile: "bg-indigo-50 hover:bg-indigo-100/80",
    iconBg: "bg-indigo-600",
    dropzoneDrag: "border-indigo-600 bg-indigo-50",
    text: "text-indigo-600",
    cardAccent: "border-indigo-600",
    buttonBg: "bg-indigo-600 text-white hover:bg-indigo-600/90",
  },
} as const;

type ColorKey = keyof typeof COLOR_STYLES;
type ToolKey = "convert" | "compress" | "merge" | "split" | "protect";

const TOOL_META: Record<
  ToolKey,
  { label: string; description: string; icon: LucideIcon; color: ColorKey }
> = {
  convert: {
    label: "Convertir",
    description: "Passez d'un format à un autre : PDF, Word, Excel, PowerPoint, images.",
    icon: ArrowRightLeft,
    color: "blue",
  },
  compress: {
    label: "Compresser",
    description: "Réduisez la taille d'un PDF sans perdre en qualité.",
    icon: Minimize2,
    color: "green",
  },
  merge: {
    label: "Fusionner",
    description: "Combinez plusieurs PDF en un seul document, dans l'ordre choisi.",
    icon: Merge,
    color: "orange",
  },
  split: {
    label: "Diviser",
    description: "Extrayez des pages précises d'un PDF.",
    icon: Scissors,
    color: "purple",
  },
  protect: {
    label: "Protéger",
    description: "Ajoutez ou retirez un mot de passe sur un PDF.",
    icon: Lock,
    color: "indigo",
  },
};

function ToolHub({ onSelect }: { onSelect: (tool: ToolKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3 lg:grid-cols-5">
      {(Object.keys(TOOL_META) as ToolKey[]).map((key) => {
        const meta = TOOL_META[key];
        const styles = COLOR_STYLES[meta.color];
        const Icon = meta.icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "group flex flex-col items-start gap-3 rounded-[16px] border border-transparent p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
              styles.tile,
            )}
          >
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-[12px] text-white transition-transform group-hover:scale-105",
                styles.iconBg,
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-base font-semibold text-marine">{meta.label}</span>
            <span className="text-sm text-muted-foreground">{meta.description}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ConverterPage() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  const meta = activeTool ? TOOL_META[activeTool] : null;
  const ActiveIcon = meta?.icon;

  return (
    <ToolLayout
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Gratuit et illimité
        </span>
      }
    >
      {activeTool === null || !meta || !ActiveIcon ? (
        <ToolHub onSelect={setActiveTool} />
      ) : (
        <div className="flex animate-in fade-in slide-in-from-bottom-1 flex-col gap-1 duration-200">
          <button
            type="button"
            onClick={() => setActiveTool(null)}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Retour
          </button>
          <div className="flex items-center gap-2 pt-1">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-[8px] text-white",
                COLOR_STYLES[meta.color].iconBg,
              )}
            >
              <ActiveIcon className="size-4" />
            </span>
            <h2 className="text-lg font-semibold text-marine">{meta.label}</h2>
          </div>

          {activeTool === "convert" && <ConvertTab color="blue" />}
          {activeTool === "compress" && <CompressTab color="green" />}
          {activeTool === "merge" && <MergeTab color="orange" />}
          {activeTool === "split" && <SplitTab color="purple" />}
          {activeTool === "protect" && <ProtectTab color="indigo" />}
        </div>
      )}
    </ToolLayout>
  );
}

type QueuedFile = { id: string; file: File; outputFormat: string };
type ConversionResult = { id: string; filename: string; url: string };

function ConvertTab({ color }: { color: ColorKey }) {
  const styles = COLOR_STYLES[color];
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [converting, setConverting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [results, setResults] = useSessionResults<ConversionResult>(
    "boulga:converter:convert-results",
  );

  function handleFiles(files: FileList) {
    const newItems = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      outputFormat: outputFormatsFor(f.name)[0],
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }

  function removeQueued(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  function updateFormat(id: string, format: string) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, outputFormat: format } : q)));
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleConvertAll() {
    setConverting(true);
    for (const item of queue) {
      setConvertingId(item.id);
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const res = await apiFetch(
          `/api/v1/tools/converter/convert?output_format=${encodeURIComponent(item.outputFormat)}`,
          { method: "POST", body: formData },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? "Échec de la conversion.");
        }
        const result: { url: string; filename: string } = await res.json();
        setResults((prev) => [...prev, { id: crypto.randomUUID(), ...result }]);
        setQueue((prev) => prev.filter((q) => q.id !== item.id));
      } catch (err) {
        toast.error(`Conversion impossible : ${item.file.name}`, {
          description: (err as Error).message,
        });
      }
    }
    setConvertingId(null);
    setConverting(false);
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DropZone
        onFiles={handleFiles}
        multiple
        accentDragClassName={styles.dropzoneDrag}
        accentTextClassName={styles.text}
      />

      {queue.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[8px] border bg-card p-3"
            >
              {convertingId === item.id ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <FileText className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 truncate text-sm">
                <p className="truncate font-medium">{item.file.name}</p>
                <p className="text-muted-foreground">{formatSize(item.file.size)}</p>
              </div>
              <Select
                value={item.outputFormat}
                onValueChange={(v) => v && updateFormat(item.id, v)}
                disabled={converting}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  {outputFormatsFor(item.file.name).map((f) => (
                    <SelectItem key={f} value={f}>
                      .{f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => removeQueued(item.id)}
                disabled={converting}
                className="shrink-0 text-muted-foreground hover:text-erreur disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleConvertAll}
          disabled={queue.length === 0 || converting}
          className={cn("w-fit", styles.buttonBg)}
        >
          {converting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
          {converting
            ? "Conversion en cours..."
            : `Convertir${queue.length > 1 ? ` (${queue.length})` : ""}`}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Tout effacer
            </button>
          </div>
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
              accentClassName={styles.cardAccent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatCompressionInfo(before: number, after: number): string {
  const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  return `${formatSize(before)} → ${formatSize(after)} (${pct >= 0 ? "-" : "+"}${Math.abs(pct)}%)`;
}

type CompressQueueItem = { id: string; file: File; level: "leger" | "fort" };
type CompressResult = { id: string; filename: string; url: string; compressionInfo: string };

function CompressTab({ color }: { color: ColorKey }) {
  const styles = COLOR_STYLES[color];
  const [queue, setQueue] = useState<CompressQueueItem[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [results, setResults] = useSessionResults<CompressResult>(
    "boulga:converter:compress-results",
  );

  function handleFiles(files: FileList) {
    const pdfsOnly = Array.from(files).filter((f) => extOf(f.name) === "pdf");
    if (pdfsOnly.length !== files.length) {
      toast.error("Seuls les fichiers PDF sont acceptés pour la compression.");
    }
    setQueue((prev) => [
      ...prev,
      ...pdfsOnly.map((f) => ({ id: crypto.randomUUID(), file: f, level: "leger" as const })),
    ]);
  }

  function removeQueued(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  function updateLevel(id: string, level: "leger" | "fort") {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, level } : q)));
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleCompressAll() {
    setCompressing(true);
    for (const item of queue) {
      setCompressingId(item.id);
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const res = await apiFetch(`/api/v1/tools/converter/compress?level=${item.level}`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? "Échec de la compression.");
        }
        const result: { url: string; filename: string; size_before: number; size_after: number } =
          await res.json();
        setResults((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            filename: result.filename,
            url: result.url,
            compressionInfo: formatCompressionInfo(result.size_before, result.size_after),
          },
        ]);
        setQueue((prev) => prev.filter((q) => q.id !== item.id));
      } catch (err) {
        toast.error(`Compression impossible : ${item.file.name}`, {
          description: (err as Error).message,
        });
      }
    }
    setCompressingId(null);
    setCompressing(false);
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DropZone
        onFiles={handleFiles}
        multiple
        accept="application/pdf"
        label="Glissez-déposez des PDF, ou"
        accentDragClassName={styles.dropzoneDrag}
        accentTextClassName={styles.text}
      />

      {queue.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[8px] border bg-card p-3"
            >
              {compressingId === item.id ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <FileText className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 truncate text-sm">
                <p className="truncate font-medium">{item.file.name}</p>
                <p className="text-muted-foreground">{formatSize(item.file.size)}</p>
              </div>
              <Select
                value={item.level}
                onValueChange={(v) => v && updateLevel(item.id, v as "leger" | "fort")}
                disabled={compressing}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leger">Légère</SelectItem>
                  <SelectItem value="fort">Forte</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => removeQueued(item.id)}
                disabled={compressing}
                className="shrink-0 text-muted-foreground hover:text-erreur disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleCompressAll}
          disabled={queue.length === 0 || compressing}
          className={cn("w-fit", styles.buttonBg)}
        >
          {compressing ? <Loader2 className="size-4 animate-spin" /> : <Minimize2 className="size-4" />}
          {compressing
            ? "Compression en cours..."
            : `Compresser${queue.length > 1 ? ` (${queue.length})` : ""}`}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Tout effacer
            </button>
          </div>
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              compressionInfo={r.compressionInfo}
              url={r.url}
              onDelete={() => removeResult(r.id)}
              accentClassName={styles.cardAccent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type MergeResult = { id: string; filename: string; url: string };

function MergeTab({ color }: { color: ColorKey }) {
  const styles = COLOR_STYLES[color];
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useSessionResults<MergeResult>("boulga:converter:merge-results");
  const dragIndex = useRef(-1);

  function addFiles(newFiles: FileList) {
    const pdfsOnly = Array.from(newFiles).filter((f) => extOf(f.name) === "pdf");
    if (pdfsOnly.length !== newFiles.length) {
      toast.error("Seuls les fichiers PDF sont acceptés pour la fusion.");
    }
    setFiles((prev) => [...prev, ...pdfsOnly]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function reorder(from: number, to: number) {
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleMerge() {
    if (files.length < 2) return;
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await apiFetch("/api/v1/tools/converter/merge", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Échec de la fusion.");
      }
      const result: { url: string; filename: string } = await res.json();
      setResults((prev) => [...prev, { id: crypto.randomUUID(), ...result }]);
      setFiles([]);
    } catch (err) {
      toast.error("Fusion impossible", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DropZone
        onFiles={addFiles}
        multiple
        accept="application/pdf"
        label="Glissez-déposez des PDF, ou"
        accentDragClassName={styles.dropzoneDrag}
        accentTextClassName={styles.text}
      />

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== -1) reorder(dragIndex.current, i);
                dragIndex.current = -1;
              }}
              className="flex items-center gap-2 rounded-[8px] border bg-card p-2.5 text-sm"
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
              <span className="w-5 shrink-0 text-muted-foreground">{i + 1}.</span>
              <span className="flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-muted-foreground">{formatSize(f.size)}</span>
              <button onClick={() => removeFile(i)} className="shrink-0 text-muted-foreground hover:text-erreur">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleMerge}
          disabled={files.length < 2 || loading}
          className={cn("w-fit", styles.buttonBg)}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />}
          {loading ? "Fusion en cours..." : "Fusionner"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Tout effacer
            </button>
          </div>
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
              accentClassName={styles.cardAccent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type SplitResult = { id: string; filename: string; url: string };

function SplitTab({ color }: { color: ColorKey }) {
  const styles = COLOR_STYLES[color];
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useSessionResults<SplitResult>("boulga:converter:split-results");

  function handleFiles(files: FileList) {
    const f = files[0];
    if (extOf(f.name) !== "pdf") {
      toast.error("Seul un fichier PDF peut être séparé.");
      return;
    }
    setFile(f);
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSplit() {
    if (!file || !pages.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(
        `/api/v1/tools/converter/split?pages=${encodeURIComponent(pages)}`,
        { method: "POST", body: formData },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Échec de l'extraction.");
      }
      const result: { url: string; filename: string } = await res.json();
      setResults((prev) => [...prev, { id: crypto.randomUUID(), ...result }]);
    } catch (err) {
      toast.error("Extraction impossible", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DropZone
        onFiles={handleFiles}
        accept="application/pdf"
        label="Glissez-déposez un PDF, ou"
        accentDragClassName={styles.dropzoneDrag}
        accentTextClassName={styles.text}
      />

      {file && (
        <div className="flex items-center gap-3 rounded-[8px] border bg-card p-3">
          <FileText className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 truncate text-sm">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-muted-foreground">{formatSize(file.size)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pages">Pages à extraire</Label>
        <Input
          id="pages"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder="1,3,5-8"
          className="max-w-xs"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSplit}
          disabled={!file || !pages.trim() || loading}
          className={cn("w-fit", styles.buttonBg)}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
          {loading ? "Extraction en cours..." : "Extraire"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Tout effacer
            </button>
          </div>
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
              accentClassName={styles.cardAccent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ProtectMode = "protect" | "unlock";
type ProtectResult = { id: string; filename: string; url: string };

function ProtectTab({ color }: { color: ColorKey }) {
  const styles = COLOR_STYLES[color];
  const [mode, setMode] = useState<ProtectMode>("protect");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useSessionResults<ProtectResult>(
    "boulga:converter:protect-results",
  );

  function handleFiles(files: FileList) {
    const f = files[0];
    if (extOf(f.name) !== "pdf") {
      toast.error("Seul un fichier PDF peut être protégé ou déverrouillé.");
      return;
    }
    setFile(f);
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSubmit() {
    if (!file || !password) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = mode === "protect" ? "protect" : "unlock";
      const res = await apiFetch(
        `/api/v1/tools/converter/${endpoint}?password=${encodeURIComponent(password)}`,
        { method: "POST", body: formData },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.detail ?? (mode === "protect" ? "Échec de la protection." : "Échec du déverrouillage."),
        );
      }
      const result: { url: string; filename: string } = await res.json();
      setResults((prev) => [...prev, { id: crypto.randomUUID(), ...result }]);
    } catch (err) {
      toast.error(
        mode === "protect" ? "Protection impossible" : "Déverrouillage impossible",
        { description: (err as Error).message },
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex w-fit gap-1 rounded-[8px] bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode("protect")}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-sm",
            mode === "protect" ? "bg-white shadow-sm" : "text-muted-foreground",
          )}
        >
          Ajouter un mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode("unlock")}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-sm",
            mode === "unlock" ? "bg-white shadow-sm" : "text-muted-foreground",
          )}
        >
          Retirer un mot de passe
        </button>
      </div>

      <DropZone
        onFiles={handleFiles}
        accept="application/pdf"
        label="Glissez-déposez un PDF, ou"
        accentDragClassName={styles.dropzoneDrag}
        accentTextClassName={styles.text}
      />

      {file && (
        <div className="flex items-center gap-3 rounded-[8px] border bg-card p-3">
          <FileText className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 truncate text-sm">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-muted-foreground">{formatSize(file.size)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="protect-password">Mot de passe</Label>
        <Input
          id="protect-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!file || !password || loading}
          className={cn("w-fit", styles.buttonBg)}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === "protect" ? (
            <Lock className="size-4" />
          ) : (
            <Unlock className="size-4" />
          )}
          {loading
            ? "Traitement en cours..."
            : mode === "protect"
              ? "Protéger"
              : "Déverrouiller"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Tout effacer
            </button>
          </div>
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
              accentClassName={styles.cardAccent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
