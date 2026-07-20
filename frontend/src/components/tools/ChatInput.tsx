"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, Square, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ChatInput({
  onSend,
  placeholder,
  disabled,
  isStreaming,
  onStop,
  settingsSlot,
  value: controlledValue,
  onValueChange,
  className,
}: {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  settingsSlot?: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue ?? internalValue;
  const setValue = onValueChange ?? setInternalValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      className={cn(
        "sticky bottom-0 flex flex-col gap-1.5 rounded-3xl border border-input bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Message"
        className={cn(
          "field-sizing-content max-h-32 min-h-8 w-full resize-none bg-transparent px-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      <div className="flex items-center justify-between">
        {settingsSlot ? (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label="Options avancées"
                />
              }
            >
              <Settings2 className="size-4" />
            </PopoverTrigger>
            <PopoverContent align="start" side="top">
              {settingsSlot}
            </PopoverContent>
          </Popover>
        ) : (
          <span />
        )}

        {isStreaming ? (
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            onClick={onStop}
            aria-label="Arrêter"
            className="rounded-full"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          value.trim().length > 0 && (
            <Button
              type="button"
              size="icon-sm"
              onClick={submit}
              disabled={disabled}
              aria-label="Envoyer"
              className="rounded-full bg-bleu-boulga text-white hover:bg-bleu-boulga/90"
            >
              <ArrowUp className="size-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}
