type BarDatum = { label: string; value: number };

export function BarChart({
  data,
  formatValue = (v) => v.toLocaleString("fr-FR"),
  color = "var(--bleu-boulga)",
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
  color?: string;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnee sur cette periode.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-muted-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="flex-1 rounded-full bg-muted" title={`${d.label} : ${formatValue(d.value)}`}>
            <div
              className="h-2.5 rounded-full"
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-xs font-medium">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
