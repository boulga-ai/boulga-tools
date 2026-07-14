"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { useQuota } from "@/hooks/useQuota";

export function QuotaBar() {
  const { quota, loading } = useQuota();

  return (
    <Link
      href="/settings"
      className="flex flex-col gap-1 rounded-[8px] border bg-card px-3 py-2.5 text-xs transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Coins className="size-3.5" />
        <span>Quota du mois</span>
      </div>
      {loading || !quota ? (
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      ) : (
        <>
          <span className="font-medium text-foreground">
            {quota.words_remaining.toLocaleString("fr-FR")} mots restants
          </span>
          <span className="text-muted-foreground">
            {quota.downloads_remaining.toLocaleString("fr-FR")} téléchargements restants
          </span>
        </>
      )}
    </Link>
  );
}
