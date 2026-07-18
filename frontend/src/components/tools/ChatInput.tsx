"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Send, Square, Settings2 } from "lucide-react";
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
        "sticky bottom-0 flex items-end gap-2 border-t bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]",
        className,
      )}
    >
      {settingsSlot && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
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
      )}

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
          "field-sizing-content max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-transparent px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      {isStreaming ? (
        <Button
          type="button"
          size="icon"
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
            size="icon"
            onClick={submit}
            disabled={disabled}
            aria-label="Envoyer"
            className="rounded-full bg-bleu-boulga text-white hover:bg-bleu-boulga/90"
          >
            <Send className="size-4" />
          </Button>
        )
      )}
    </div>
  );
}
