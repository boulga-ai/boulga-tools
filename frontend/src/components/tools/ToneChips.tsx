"use client";

import { cn } from "@/lib/utils";

export const TONES = [
  { value: "Convivial", label: "Convivial" },
  { value: "Professionnel", label: "Professionnel" },
  { value: "Inspirant", label: "Inspirant" },
  { value: "Humoristique", label: "Humoristique" },
  { value: "Informatif", label: "Informatif" },
  { value: "Promotionnel", label: "Promotionnel" },
];

export function ToneChips({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (tone: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Ton" className="flex flex-wrap gap-1.5">
      {TONES.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "bg-bleu-boulga font-medium text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
