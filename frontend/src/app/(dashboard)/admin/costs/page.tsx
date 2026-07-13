"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type CostRow = {
  tool: string;
  tier: string;
  model: string;
  count: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  avg_cost_usd: number;
};

const PERIODS = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "90 derniers jours" },
];

export default function AdminCostsPage() {
  const [period, setPeriod] = useState("30d");
  const [rows, setRows] = useState<CostRow[]>([]);

  useEffect(() => {
    apiFetch(`/api/v1/admin/costs?period=${period}`).then((res) => {
      if (res.ok) res.json().then(setRows);
    });
  }, [period]);

  const total = rows.reduce((sum, r) => sum + r.cost_usd, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Couts</h1>
          <p className="text-muted-foreground">Cout reel par outil, palier et modele.</p>
        </div>
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-[12px] border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Outil</TableHead>
              <TableHead>Palier</TableHead>
              <TableHead>Modele</TableHead>
              <TableHead className="text-right">Generations</TableHead>
              <TableHead className="text-right">Tokens in</TableHead>
              <TableHead className="text-right">Tokens out</TableHead>
              <TableHead className="text-right">Cout total</TableHead>
              <TableHead className="text-right">Cout moyen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.tool}</TableCell>
                <TableCell>{r.tier}</TableCell>
                <TableCell className="font-mono text-xs">{r.model}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right">{r.tokens_in.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right">{r.tokens_out.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right">${r.cost_usd.toFixed(4)}</TableCell>
                <TableCell className="text-right">${r.avg_cost_usd.toFixed(6)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucune donnee sur cette periode.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-right text-sm font-medium">Total : ${total.toFixed(4)}</p>
    </div>
  );
}
