"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RefineBar({
  presets,
  onRefine,
  disabled,
}: {
  presets: string[];
  onRefine: (instruction: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(instruction: string) {
    if (!instruction.trim() || disabled) return;
    onRefine(instruction.trim());
    setValue("");
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">Affiner ce résultat</p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => submit(preset)}
          >
            {preset}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(value);
          }}
          placeholder="Précise ce que tu veux changer..."
          disabled={disabled}
        />
        <Button type="button" onClick={() => submit(value)} disabled={disabled || !value.trim()}>
          <Wand2 className="size-4" />
          Affiner
        </Button>
      </div>
    </div>
  );
}
