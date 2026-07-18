"use client";

import {
  Briefcase,
  ThumbsUp,
  X as XIcon,
  Camera,
  MessageCircle,
  Music2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: ThumbsUp },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "instagram", label: "Instagram", icon: Camera },
  { value: "linkedin", label: "LinkedIn", icon: Briefcase },
  { value: "twitter", label: "X", icon: XIcon },
  { value: "tiktok", label: "TikTok", icon: Music2 },
];

export function PlatformChips({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (platform: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Plateforme" className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => {
        const selected = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-bleu-boulga/30 bg-bleu-boulga/10 font-medium text-bleu-boulga"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <p.icon className="size-4" />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
