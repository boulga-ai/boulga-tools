function Pill({
  score,
  label,
  colorClass,
}: {
  score: number;
  label: string;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${colorClass}`}
    >
      {score}% {label}
    </span>
  );
}

export function ScoreGauge({
  aiScore,
  humanScore,
  mixedScore,
  aiLabel = "IA",
  humanLabel = "Humain",
  mixedLabel = "Mixte",
}: {
  aiScore: number;
  humanScore: number;
  mixedScore?: number;
  aiLabel?: string;
  humanLabel?: string;
  mixedLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill score={aiScore} label={aiLabel} colorClass="border-erreur/30 bg-erreur/10 text-erreur" />
      {mixedScore !== undefined && (
        <Pill
          score={mixedScore}
          label={mixedLabel}
          colorClass="border-attention/30 bg-attention/10 text-attention"
        />
      )}
      <Pill score={humanScore} label={humanLabel} colorClass="border-succes/30 bg-succes/10 text-succes" />
    </div>
  );
}
