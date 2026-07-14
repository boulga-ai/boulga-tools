import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerationError({
  message,
  isQuotaError,
  onRetry,
}: {
  message: string;
  isQuotaError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-erreur/30 bg-erreur/5 p-3.5 text-sm text-erreur">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>{message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {isQuotaError ? (
          <Link href="/settings">
            <Button size="sm" variant="destructive">
              Passer au palier supérieur
            </Button>
          </Link>
        ) : (
          onRetry && (
            <Button size="sm" variant="destructive" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              Réessayer
            </Button>
          )
        )}
      </div>
    </div>
  );
}
