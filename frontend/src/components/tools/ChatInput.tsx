"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, Loader2, Paperclip, Square, Settings2 } from "lucide-react";
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
  // Vrai chat (Chat IA, Social Posts) : le champ se vide apres envoi. Outils formulaire
  // (Email, Discours...) : le texte reste visible, il est reutilise par "Regenerer"/l'affinage.
  clearOnSend = true,
  // Fourni uniquement par les outils qui savent extraire un fichier joint (voir
  // DocumentWorkspace) — absent partout ailleurs, aucun changement visuel sinon.
  onAttachFile,
  attaching,
  attachAccept = ".pdf,.docx,.txt",
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
  clearOnSend?: boolean;
  onAttachFile?: (file: File) => void;
  attaching?: boolean;
  attachAccept?: string;
}) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue ?? internalValue;
  const setValue = onValueChange ?? setInternalValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de resélectionner le même fichier ensuite
    if (file) onAttachFile?.(file);
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    if (clearOnSend) setValue("");
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
        <div className="flex items-center gap-0.5">
          {onAttachFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={attachAccept}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled || attaching}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Joindre un fichier"
                title="Joindre un fichier (PDF, DOCX, TXT)"
              >
                {attaching ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              </Button>
            </>
          )}
          {settingsSlot && (
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
          )}
        </div>

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
