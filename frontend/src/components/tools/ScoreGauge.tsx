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
    <div className="flex flex-col gap-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-erreur" style={{ width: `${aiScore}%` }} />
        {mixedScore !== undefined && (
          <div className="bg-attention" style={{ width: `${mixedScore}%` }} />
        )}
        <div className="bg-succes" style={{ width: `${humanScore}%` }} />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-erreur">
          {aiScore}% {aiLabel}
        </span>
        {mixedScore !== undefined && (
          <span className="text-attention">
            {mixedScore}% {mixedLabel}
          </span>
        )}
        <span className="text-succes">
          {humanScore}% {humanLabel}
        </span>
      </div>
    </div>
  );
}
