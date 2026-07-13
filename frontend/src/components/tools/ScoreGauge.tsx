export function ScoreGauge({
  aiScore,
  humanScore,
  aiLabel = "IA",
  humanLabel = "Humain",
}: {
  aiScore: number;
  humanScore: number;
  aiLabel?: string;
  humanLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-erreur" style={{ width: `${aiScore}%` }} />
        <div className="bg-succes" style={{ width: `${humanScore}%` }} />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-erreur">
          {aiScore}% {aiLabel}
        </span>
        <span className="text-succes">
          {humanScore}% {humanLabel}
        </span>
      </div>
    </div>
  );
}
