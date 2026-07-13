import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TemplateOption = { value: string; label: string; description: string };

export function TemplateSelector({
  options,
  value,
  onChange,
}: {
  options: TemplateOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col gap-1 rounded-[12px] border p-4 text-left transition-colors",
              selected ? "border-bleu-boulga bg-blue-50" : "border-border hover:bg-accent",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{option.label}</span>
              {selected && <Check className="size-4 text-bleu-boulga" />}
            </div>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
