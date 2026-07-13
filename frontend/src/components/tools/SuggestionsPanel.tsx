import { Sparkles } from "lucide-react";

export type AnalysisResult = {
  completeness_score?: number;
  missing_fields?: string[];
  suggestions?: Record<string, string>;
  recommended_skills?: string[];
};

export function SuggestionsPanel({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border bg-blue-50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-bleu-boulga" />
        <h3 className="text-bleu-boulga">Analyse de vos informations</h3>
        {typeof analysis.completeness_score === "number" && (
          <span className="ml-auto text-sm font-medium text-bleu-boulga">
            {analysis.completeness_score}% complet
          </span>
        )}
      </div>

      {analysis.missing_fields && analysis.missing_fields.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Champs manquants</p>
          <p className="text-sm">{analysis.missing_fields.join(", ")}</p>
        </div>
      )}

      {analysis.suggestions && Object.keys(analysis.suggestions).length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Suggestions</p>
          {Object.entries(analysis.suggestions).map(([key, value]) => (
            <p key={key} className="text-sm">
              <span className="font-medium">{key} : </span>
              {value}
            </p>
          ))}
        </div>
      )}

      {analysis.recommended_skills && analysis.recommended_skills.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Competences suggerees
          </p>
          <p className="text-sm">{analysis.recommended_skills.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
