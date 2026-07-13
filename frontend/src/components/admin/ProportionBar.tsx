const TIER_LABELS: Record<string, string> = {
  introduction: "Introduction",
  goutte: "Goutte",
  source: "Source",
  fleuve: "Fleuve",
  ocean: "Ocean",
};

// Rampe sequentielle : les paliers sont ordonnes (introduction -> ocean), pas une identite
// categorielle arbitraire — le degrade du Bleu Boulga porte cet ordre naturellement.
const TIER_COLORS: Record<string, string> = {
  introduction: "var(--blue-100)",
  goutte: "var(--blue-300)",
  source: "var(--blue-500)",
  fleuve: "var(--blue-700)",
  ocean: "var(--blue-900)",
};

export function ProportionBar({ byTier }: { byTier: Record<string, number> }) {
  const total = Object.values(byTier).reduce((sum, n) => sum + n, 0);
  const tiers = Object.keys(TIER_LABELS).filter((t) => (byTier[t] ?? 0) > 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Aucun utilisateur pour le moment.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {tiers.map((tier) => (
          <div
            key={tier}
            style={{ width: `${(byTier[tier] / total) * 100}%`, backgroundColor: TIER_COLORS[tier] }}
            title={`${TIER_LABELS[tier]} : ${byTier[tier]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {tiers.map((tier) => (
          <div key={tier} className="flex items-center gap-1.5 text-xs">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] }} />
            <span className="text-muted-foreground">
              {TIER_LABELS[tier]} ({byTier[tier]})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
