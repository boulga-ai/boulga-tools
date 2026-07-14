"use client";

import { GripVertical } from "lucide-react";
import { Group, Panel, Separator, type GroupProps, type PanelProps, type SeparatorProps } from "react-resizable-panels";

import { cn } from "@/lib/utils";

// react-resizable-panels fixe deja display/flex-direction/overflow en interne
// (voir sa doc) — on ne touche qu'a la taille et l'habillage visuel ici.
function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return <Group className={cn("h-full w-full", className)} {...props} />;
}

function ResizablePanel({ ...props }: PanelProps) {
  return <Panel {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: SeparatorProps & { withHandle?: boolean }) {
  return (
    <Separator
      className={cn(
        "relative flex w-px shrink-0 items-center justify-center bg-border outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 hover:bg-bleu-boulga active:bg-bleu-boulga",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-[4px] border bg-border">
          <GripVertical className="size-2.5" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
