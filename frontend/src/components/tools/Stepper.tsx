import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number;
  onStepClick?: (step: number) => void;
}) {
  return (
    <>
      {/* Desktop : horizontal */}
      <div className="hidden items-center gap-1 md:flex">
        {steps.map((label, i) => {
          const step = i + 1;
          const state = step < current ? "done" : step === current ? "current" : "todo";
          return (
            <div key={step} className="flex flex-1 items-center gap-1">
              <button
                onClick={() => onStepClick?.(step)}
                disabled={step > current}
                className="flex items-center gap-2 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    state === "done" && "bg-succes text-white",
                    state === "current" && "bg-bleu-boulga text-white",
                    state === "todo" && "bg-muted text-muted-foreground",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : step}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs",
                    state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
              {step < steps.length && <div className="h-px flex-1 bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Mobile : compact vertical */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bleu-boulga text-xs font-medium text-white">
          {current}
        </span>
        <span className="text-sm font-medium">
          Etape {current}/{steps.length} — {steps[current - 1]}
        </span>
      </div>
    </>
  );
}
