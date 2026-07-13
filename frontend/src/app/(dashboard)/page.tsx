import Link from "next/link";
import { ACCESS_BADGES, TOOLS } from "@/lib/tools";
import { ToolIcon } from "@/components/tool-icon";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-marine">Boulga AI</h1>
        <p className="text-muted-foreground">Puiser l&apos;intelligence qu&apos;il vous faut</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const badge = ACCESS_BADGES[tool.access];
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex flex-col gap-3 rounded-[12px] border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-[8px] bg-blue-50 text-bleu-boulga">
                  <ToolIcon name={tool.icon} className="size-4.5" />
                </div>
                <span className={cn("rounded-[4px] px-2 py-0.5 text-xs font-medium", badge.className)}>
                  {badge.label}
                </span>
              </div>
              <div>
                <h3 className="text-foreground">{tool.label}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
