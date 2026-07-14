import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/CopyButton";
import { MarkdownContent } from "@/components/tools/MarkdownContent";

function parseEmail(text: string): { subject: string; body: string } {
  if (!/^objet\s*:/i.test(text)) return { subject: "", body: text };

  const separatorIndex = text.indexOf("\n\n");
  if (separatorIndex === -1) {
    const firstLine = text.split("\n")[0] ?? "";
    return { subject: firstLine.replace(/^objet\s*:\s*/i, ""), body: "" };
  }

  const firstLine = text.slice(0, separatorIndex).split("\n")[0] ?? "";
  return {
    subject: firstLine.replace(/^objet\s*:\s*/i, ""),
    body: text.slice(separatorIndex + 2).trim(),
  };
}

export function EmailOutput({
  text,
  isStreaming,
  onRegenerate,
}: {
  text: string;
  isStreaming: boolean;
  onRegenerate?: () => void;
}) {
  if (!text) {
    return (
      <div className="flex min-h-40 flex-1 items-center justify-center rounded-[12px] border bg-card p-4 text-sm italic text-muted-foreground">
        Le résultat apparaîtra ici.
      </div>
    );
  }

  const { subject, body } = parseEmail(text);
  const fullText = subject ? `Objet : ${subject}\n\n${body}` : text;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border bg-card">
      <div className="border-b bg-blue-50 px-4 py-2.5">
        <span className="text-xs font-medium uppercase text-muted-foreground">Objet</span>
        <p className="font-semibold text-marine">
          {subject}
          {isStreaming && !body && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-bleu-boulga align-text-bottom" />
          )}
        </p>
      </div>
      <div className="flex-1 p-4">
        {body && <MarkdownContent text={body} />}
        {isStreaming && body && (
          <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-bleu-boulga align-text-bottom" />
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t bg-muted/30 px-4 py-2.5">
        <CopyButton text={fullText} label="Copier l'email complet" disabled={isStreaming} />
        <CopyButton
          text={body}
          label="Copier le corps seulement"
          variant="outline"
          disabled={isStreaming || !body}
        />
        {onRegenerate && (
          <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={isStreaming}>
            <RotateCcw className="size-3.5" />
            Régénérer
          </Button>
        )}
      </div>
    </div>
  );
}
