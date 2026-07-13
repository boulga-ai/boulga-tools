"use client";

import { useEffect, useState } from "react";
import { StatTile } from "@/components/admin/StatTile";
import { BarChart } from "@/components/admin/BarChart";
import { ProportionBar } from "@/components/admin/ProportionBar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

type Kpis = {
  users: { total: number; new_7d: number; new_30d: number; by_tier: Record<string, number> };
  costs: {
    today_usd: number;
    week_usd: number;
    month_usd: number;
    avg_per_generation_usd: number;
    by_tool: Record<string, number>;
    claude_usd: number;
    other_models_usd: number;
  };
  volumes: { generations_30d: number; words_generated_30d: number; documents_downloaded_30d: number };
};

function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

export default function AdminPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/admin/kpis").then((res) => {
      if (res.ok) res.json().then(setKpis);
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1>Administration</h1>
        <p className="text-muted-foreground">Indicateurs cles de la plateforme.</p>
      </div>

      {!kpis ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[12px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Total utilisateurs" value={kpis.users.total.toLocaleString("fr-FR")} />
            <StatTile label="Nouveaux 7j" value={kpis.users.new_7d.toLocaleString("fr-FR")} />
            <StatTile label="Cout du jour" value={formatUsd(kpis.costs.today_usd)} />
            <StatTile label="Cout du mois" value={formatUsd(kpis.costs.month_usd)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[12px] border bg-card p-5">
              <h3 className="mb-4">Cout par outil (30 derniers jours)</h3>
              <BarChart
                data={Object.entries(kpis.costs.by_tool).map(([label, value]) => ({ label, value }))}
                formatValue={formatUsd}
              />
            </div>

            <div className="rounded-[12px] border bg-card p-5">
              <h3 className="mb-4">Claude vs autres modeles</h3>
              <BarChart
                data={[
                  { label: "Claude", value: kpis.costs.claude_usd },
                  { label: "Autres modeles", value: kpis.costs.other_models_usd },
                ]}
                formatValue={formatUsd}
              />
            </div>
          </div>

          <div className="rounded-[12px] border bg-card p-5">
            <h3 className="mb-4">Repartition des utilisateurs par palier</h3>
            <ProportionBar byTier={kpis.users.by_tier} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Generations (30j)" value={kpis.volumes.generations_30d.toLocaleString("fr-FR")} />
            <StatTile
              label="Mots generes (30j)"
              value={kpis.volumes.words_generated_30d.toLocaleString("fr-FR")}
            />
            <StatTile
              label="Documents telecharges (30j)"
              value={kpis.volumes.documents_downloaded_30d.toLocaleString("fr-FR")}
            />
          </div>
        </>
      )}
    </div>
  );
}
