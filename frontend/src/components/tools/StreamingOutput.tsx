import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/tools/MarkdownContent";

export function StreamingOutput({
  text,
  isStreaming,
  placeholder = "Le résultat apparaîtra ici.",
  className,
}: {
  text: string;
  isStreaming: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-40 flex-1 rounded-[12px] border bg-card p-4 leading-relaxed",
        !text && "text-muted-foreground italic",
        className,
      )}
    >
      {text ? (
        <MarkdownContent text={text} />
      ) : (
        !isStreaming && placeholder
      )}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-bleu-boulga align-text-bottom" />
      )}
    </div>
  );
}
