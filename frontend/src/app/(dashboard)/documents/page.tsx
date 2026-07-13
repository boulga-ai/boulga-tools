"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FolderClosed, Download, RotateCcw, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";

type DocumentRow = {
  id: string;
  tool: string;
  title: string;
  template: string;
  format: "docx" | "pdf";
  created_at: string;
};

const TOOL_LABELS: Record<string, string> = {
  cv: "CV",
  cover_letter: "Lettre de motivation",
  pro_doc: "Document professionnel",
  academic: "Document academique",
};

const TEMPLATES_BY_TOOL: Record<string, { value: string; label: string }[]> = {
  cv: [
    { value: "cv_modern", label: "Moderne" },
    { value: "cv_classic", label: "Classique" },
  ],
  cover_letter: [
    { value: "letter_standard", label: "Standard" },
    { value: "letter_modern", label: "Moderne" },
  ],
  pro_doc: [
    { value: "pro_corporate", label: "Corporate" },
    { value: "pro_minimal", label: "Minimal" },
  ],
  academic: [
    { value: "academic_formal", label: "Formel" },
    { value: "academic_clean", label: "Epure" },
  ],
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [toolFilter, setToolFilter] = useState<string>("all");

  useEffect(() => {
    apiFetch("/api/v1/documents").then((res) => {
      if (res.ok) res.json().then(setDocuments);
    });
  }, []);

  async function handleDownload(id: string) {
    const res = await apiFetch(`/api/v1/documents/${id}/download`);
    if (!res.ok) {
      toast.error("Telechargement impossible");
      return;
    }
    const data = await res.json();
    window.open(data.url, "_blank");
  }

  async function handleRerender(doc: DocumentRow, template: string) {
    const res = await apiFetch(`/api/v1/documents/${doc.id}/rerender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, format: doc.format }),
    });
    if (!res.ok) {
      toast.error("Regeneration impossible", {
        description: (await res.json().catch(() => null))?.detail,
      });
      return;
    }
    const data = await res.json();
    window.open(data.url, "_blank");
    const refreshed = await apiFetch("/api/v1/documents");
    if (refreshed.ok) setDocuments(await refreshed.json());
    toast.success("Document regenere");
  }

  async function handleDelete(id: string) {
    const res = await apiFetch(`/api/v1/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Suppression impossible");
      return;
    }
    setDocuments((prev) => prev?.filter((d) => d.id !== id) ?? null);
    toast.success("Document supprime");
  }

  const filtered = documents?.filter((d) => toolFilter === "all" || d.tool === toolFilter) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Documents</h1>
          <p className="text-muted-foreground">Historique de vos documents generes.</p>
        </div>
        <Select value={toolFilter} onValueChange={(v) => v && setToolFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les outils</SelectItem>
            {Object.entries(TOOL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {documents === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[12px]" />
          ))}
        </div>
      )}

      {documents !== null && filtered.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed p-12 text-center text-muted-foreground">
          <FolderClosed className="size-6" />
          <p>Aucun document pour le moment.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center gap-3 rounded-[12px] border bg-card p-4">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{TOOL_LABELS[doc.tool] ?? doc.tool}</Badge>
                <span>{doc.template}</span>
                <span className="uppercase">{doc.format}</span>
                <span>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleDownload(doc.id)}>
              <Download className="size-3.5" /> Telecharger
            </Button>
            <Select onValueChange={(v) => typeof v === "string" && handleRerender(doc, v)}>
              <SelectTrigger className="w-auto" size="sm">
                <RotateCcw className="size-3.5" />
                <SelectValue placeholder="Regenerer" />
              </SelectTrigger>
              <SelectContent>
                {(TEMPLATES_BY_TOOL[doc.tool] ?? []).map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger className="flex size-8 shrink-0 items-center justify-center rounded-[8px] hover:bg-accent">
                <Trash2 className="size-3.5 text-erreur" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irreversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(doc.id)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
