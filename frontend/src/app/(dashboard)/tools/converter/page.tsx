"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Merge,
  Scissors,
  FileText,
  Trash2,
  Loader2,
  GripVertical,
  Minimize2,
  LayoutGrid,
  Lock,
  Unlock,
} from "lucide-react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DropZone } from "@/components/tools/DropZone";
import { ConversionResultCard } from "@/components/tools/ConversionResultCard";
import type { PageOperation } from "@/components/tools/PdfPageThumbnails";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

// pdfjs-dist touche des API navigateur (Worker, DOMMatrix...) absentes cote serveur —
// meme convention que PdfViewer.tsx.
const PdfPageThumbnails = dynamic(
  () => import("@/components/tools/PdfPageThumbnails").then((m) => m.PdfPageThumbnails),
  { ssr: false },
);

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];
const OFFICE_TO_PDF: Record<string, string[]> = {
  docx: ["pdf"],
  doc: ["pdf"],
  odt: ["pdf"],
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

export default function ConverterPage() {
  return (
    <ToolLayout
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Gratuit et illimité
        </span>
      }
    >
      <Tabs defaultValue="convert" className="flex-1">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="convert">Convertir</TabsTrigger>
          <TabsTrigger value="compress">Compresser</TabsTrigger>
          <TabsTrigger value="merge">Fusionner PDF</TabsTrigger>
          <TabsTrigger value="split">Séparer PDF</TabsTrigger>
          <TabsTrigger value="organize">Organiser</TabsTrigger>
          <TabsTrigger value="protect">Protéger</TabsTrigger>
        </TabsList>

        <TabsContent value="convert">
          <ConvertTab />
        </TabsContent>
        <TabsContent value="compress">
          <CompressTab />
        </TabsContent>
        <TabsContent value="organize">
          <OrganizeTab />
        </TabsContent>
        <TabsContent value="protect">
          <ProtectTab />
        </TabsContent>
        <TabsContent value="merge">
          <MergeTab />
        </TabsContent>
        <TabsContent value="split">
          <SplitTab />
        </TabsContent>
      </Tabs>
    </ToolLayout>
  );
}

type QueuedFile = { id: string; file: File; outputFormat: string };
type ConversionResult = { id: string; filename: string; url: string };

function ConvertTab() {
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
      <DropZone onFiles={handleFiles} multiple />

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
        <Button onClick={handleConvertAll} disabled={queue.length === 0 || converting} className="w-fit">
          {converting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
          {converting
            ? "Conversion en cours..."
            : `Convertir${queue.length > 1 ? ` (${queue.length})` : ""}`}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
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

function CompressTab() {
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
        <Button onClick={handleCompressAll} disabled={queue.length === 0 || compressing} className="w-fit">
          {compressing ? <Loader2 className="size-4 animate-spin" /> : <Minimize2 className="size-4" />}
          {compressing
            ? "Compression en cours..."
            : `Compresser${queue.length > 1 ? ` (${queue.length})` : ""}`}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              compressionInfo={r.compressionInfo}
              url={r.url}
              onDelete={() => removeResult(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type MergeResult = { id: string; filename: string; url: string };

function MergeTab() {
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
      <DropZone onFiles={addFiles} multiple accept="application/pdf" label="Glissez-déposez des PDF, ou" />

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
        <Button onClick={handleMerge} disabled={files.length < 2 || loading} className="w-fit">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Merge className="size-4" />}
          {loading ? "Fusion en cours..." : "Fusionner"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type SplitResult = { id: string; filename: string; url: string };

function SplitTab() {
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
      <DropZone onFiles={handleFiles} accept="application/pdf" label="Glissez-déposez un PDF, ou" />

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
        <Button onClick={handleSplit} disabled={!file || !pages.trim() || loading} className="w-fit">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
          {loading ? "Extraction en cours..." : "Extraire"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type OrganizeResult = { id: string; filename: string; url: string };

function OrganizeTab() {
  const [file, setFile] = useState<File | null>(null);
  const [operations, setOperations] = useState<PageOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useSessionResults<OrganizeResult>(
    "boulga:converter:organize-results",
  );

  function handleFiles(files: FileList) {
    const f = files[0];
    if (extOf(f.name) !== "pdf") {
      toast.error("Seul un fichier PDF peut être organisé.");
      return;
    }
    setFile(f);
    setOperations([]);
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleApply() {
    if (!file || operations.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("operations", JSON.stringify(operations));
      const res = await apiFetch("/api/v1/tools/converter/organize", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Échec de l'organisation.");
      }
      const result: { url: string; filename: string } = await res.json();
      setResults((prev) => [...prev, { id: crypto.randomUUID(), ...result }]);
    } catch (err) {
      toast.error("Organisation impossible", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DropZone onFiles={handleFiles} accept="application/pdf" label="Glissez-déposez un PDF, ou" />

      {file && (
        <PdfPageThumbnails file={file} onOperationsChange={setOperations} />
      )}

      {file && (
        <div className="flex items-center gap-3">
          <Button onClick={handleApply} disabled={operations.length === 0 || loading} className="w-fit">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LayoutGrid className="size-4" />}
            {loading ? "Application en cours..." : "Appliquer"}
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ProtectMode = "protect" | "unlock";
type ProtectResult = { id: string; filename: string; url: string };

function ProtectTab() {
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
          className={`rounded-[6px] px-3 py-1.5 text-sm ${mode === "protect" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
        >
          Ajouter un mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode("unlock")}
          className={`rounded-[6px] px-3 py-1.5 text-sm ${mode === "unlock" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
        >
          Retirer un mot de passe
        </button>
      </div>

      <DropZone onFiles={handleFiles} accept="application/pdf" label="Glissez-déposez un PDF, ou" />

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
        <Button onClick={handleSubmit} disabled={!file || !password || loading} className="w-fit">
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
          {results.map((r) => (
            <ConversionResultCard
              key={r.id}
              filename={r.filename}
              url={r.url}
              onDelete={() => removeResult(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
