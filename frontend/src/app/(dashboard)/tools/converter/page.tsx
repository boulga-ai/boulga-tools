"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Merge,
  Scissors,
  FileText,
  Trash2,
  Download,
  Loader2,
  GripVertical,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

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
      title="Convertisseur de fichiers"
      description="Convertit PDF, Word, Excel, PowerPoint et images, avec fusion et séparation de PDF."
      badge={
        <span className="w-fit rounded-[4px] bg-succes/10 px-2 py-0.5 text-xs font-medium text-succes">
          Gratuit et illimité
        </span>
      }
    >
      <Tabs defaultValue="convert" className="flex-1">
        <TabsList>
          <TabsTrigger value="convert">Convertir</TabsTrigger>
          <TabsTrigger value="merge">Fusionner PDF</TabsTrigger>
          <TabsTrigger value="split">Séparer PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="convert">
          <ConvertTab />
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

function ResultDownload({ url, filename }: { url: string; filename: string }) {
  return (
    <a href={url} download={filename} target="_blank" rel="noreferrer">
      <Button variant="outline" className="w-fit">
        <Download className="size-4" />
        Télécharger {filename}
      </Button>
    </a>
  );
}

type QueuedFile = { id: string; file: File; outputFormat: string };
type ConversionResult = { id: string; filename: string; url: string };

function ConvertTab() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [converting, setConverting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [results, setResults] = useState<ConversionResult[]>([]);

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

function MergeTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  const dragIndex = useRef(-1);

  function addFiles(newFiles: FileList) {
    const pdfsOnly = Array.from(newFiles).filter((f) => extOf(f.name) === "pdf");
    if (pdfsOnly.length !== newFiles.length) {
      toast.error("Seuls les fichiers PDF sont acceptés pour la fusion.");
    }
    setFiles((prev) => [...prev, ...pdfsOnly]);
    setResult(null);
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

  async function handleMerge() {
    if (files.length < 2) return;
    setLoading(true);
    setResult(null);
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
      setResult(await res.json());
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
        {result && <ResultDownload {...result} />}
      </div>
    </div>
  );
}

function SplitTab() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

  function handleFiles(files: FileList) {
    const f = files[0];
    if (extOf(f.name) !== "pdf") {
      toast.error("Seul un fichier PDF peut être séparé.");
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleSplit() {
    if (!file || !pages.trim()) return;
    setLoading(true);
    setResult(null);
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
      setResult(await res.json());
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
        {result && <ResultDownload {...result} />}
      </div>
    </div>
  );
}
