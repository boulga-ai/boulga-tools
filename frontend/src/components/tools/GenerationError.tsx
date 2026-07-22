import Link from "next/link";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerationError({
  message,
  isQuotaError,
  onRetry,
  onRecover,
  recovering,
}: {
  message: string;
  isQuotaError?: boolean;
  onRetry?: () => void;
  // Une generation longue (3-4 min) peut voir sa connexion coupee sans que le
  // document_id ait ete perdu (voir useBlockStream) — le serveur continue
  // pourtant de son cote. Propose de recuperer ce qui a deja ete genere plutot
  // que de forcer une regeneration complete (couteuse) via onRetry.
  onRecover?: () => void;
  recovering?: boolean;
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
          <>
            {onRecover && (
              <Button size="sm" variant="outline" onClick={onRecover} disabled={recovering}>
                <RefreshCw className={recovering ? "size-3.5 animate-spin" : "size-3.5"} />
                {recovering ? "Vérification..." : "Vérifier si le document existe déjà"}
              </Button>
            )}
            {onRetry && (
              <Button size="sm" variant="destructive" onClick={onRetry}>
                <RotateCcw className="size-3.5" />
                Réessayer depuis le début
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
