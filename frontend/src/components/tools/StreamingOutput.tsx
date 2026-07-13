import { cn } from "@/lib/utils";

export function StreamingOutput({
  text,
  isStreaming,
  placeholder = "Le resultat apparaitra ici.",
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
        "min-h-40 flex-1 whitespace-pre-wrap rounded-[12px] border bg-card p-4 text-sm leading-relaxed",
        !text && "text-muted-foreground",
        className,
      )}
    >
      {text || (isStreaming ? "" : placeholder)}
      {isStreaming && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-bleu-boulga align-text-bottom" />}
    </div>
  );
}
