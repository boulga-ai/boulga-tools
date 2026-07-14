import { MarkdownContent } from "@/components/tools/MarkdownContent";
import { CopyButton } from "@/components/tools/CopyButton";
import { cn } from "@/lib/utils";

const SEPARATOR = "---CORRECTIONS---";

function parseReformulated(text: string): { corrected: string; corrections: string | null } {
  const idx = text.indexOf(SEPARATOR);
  if (idx === -1) return { corrected: text, corrections: null };
  return {
    corrected: text.slice(0, idx).trimEnd(),
    corrections: text.slice(idx + SEPARATOR.length).trimStart(),
  };
}

export function ReformulatorOutput({
  text,
  isStreaming,
  mode,
}: {
  text: string;
  isStreaming: boolean;
  mode: string;
}) {
  const { corrected, corrections } = parseReformulated(text);
  const showCorrections = mode === "correction";
  const separatorSeen = corrections !== null;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div
        className={cn(
          "min-h-32 flex-1 rounded-[12px] border border-l-[3px] border-l-bleu-boulga bg-card p-4 leading-relaxed",
          !corrected && "flex items-center justify-center text-center text-muted-foreground italic",
        )}
      >
        {corrected ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {showCorrections ? "Texte corrigé" : "Résultat"}
              </p>
              <CopyButton
                text={corrected}
                label={showCorrections ? "Copier le texte corrigé" : "Copier le résultat"}
                variant="outline"
                size="sm"
                disabled={isStreaming}
              />
            </div>
            <MarkdownContent text={corrected} />
            {isStreaming && !separatorSeen && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-bleu-boulga align-text-bottom" />
            )}
          </>
        ) : (
          !isStreaming && "Le résultat apparaîtra ici."
        )}
      </div>

      {showCorrections && separatorSeen && (
        <div className="rounded-[12px] bg-[#F5F7FA] p-4 text-sm leading-relaxed">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Corrections apportées
          </p>
          {corrections && <MarkdownContent text={corrections} className="text-xs" />}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-bleu-boulga align-text-bottom" />
          )}
        </div>
      )}
    </div>
  );
}
