import { Construction } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { ToolLayout } from "@/components/tools/ToolLayout";

export function ToolPlaceholder({ toolId }: { toolId: string }) {
  const tool = TOOLS.find((t) => t.id === toolId);
  if (!tool) return null;

  return (
    <ToolLayout title={tool.label} description={tool.description}>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed p-12 text-center text-muted-foreground">
        <Construction className="size-6" />
        <p>Cet outil est en construction.</p>
      </div>
    </ToolLayout>
  );
}
