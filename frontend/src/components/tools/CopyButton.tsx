"use client";

import type { ComponentProps } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/useCopy";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copier",
  copiedLabel = "Copié",
  className,
  disabled,
  ...props
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const { copied, copy } = useCopy();

  return (
    <Button
      type="button"
      onClick={() => copy(text)}
      disabled={disabled || !text}
      className={cn(copied && "bg-succes text-white hover:bg-succes", className)}
      {...props}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? `${copiedLabel} ✓` : label}
    </Button>
  );
}
