"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderClosed, Settings, LogOut, ShieldCheck } from "lucide-react";
import { PACK_LABELS, toolsByPack, type ToolPack } from "@/lib/tools";
import { ToolIcon } from "@/components/tool-icon";
import { QuotaBar } from "@/components/layout/QuotaBar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PACK_ORDER: ToolPack[] = ["gratuit", "redaction", "documents"];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const initials = (profile?.full_name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col gap-4 border-r bg-sidebar px-3 py-4",
        className,
      )}
    >
      <Link href="/" className="px-2 text-lg font-semibold text-marine">
        Boulga AI
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {PACK_ORDER.map((pack) => (
          <div key={pack}>
            <p className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {PACK_LABELS[pack]}
            </p>
            <div className="flex flex-col gap-0.5">
              {toolsByPack(pack).map((tool) => {
                const active = pathname === tool.href;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-blue-50 font-medium text-bleu-boulga"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <ToolIcon name={tool.icon} className="size-4 shrink-0" />
                    <span className="truncate">{tool.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-0.5 border-t pt-3">
          <Link
            href="/documents"
            className={cn(
              "flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm transition-colors",
              pathname === "/documents"
                ? "bg-blue-50 font-medium text-bleu-boulga"
                : "text-foreground hover:bg-accent",
            )}
          >
            <FolderClosed className="size-4 shrink-0" />
            Documents
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm transition-colors",
              pathname === "/settings"
                ? "bg-blue-50 font-medium text-bleu-boulga"
                : "text-foreground hover:bg-accent",
            )}
          >
            <Settings className="size-4 shrink-0" />
            Parametres
          </Link>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-blue-50 font-medium text-bleu-boulga"
                  : "text-foreground hover:bg-accent",
              )}
            >
              <ShieldCheck className="size-4 shrink-0" />
              Administration
            </Link>
          )}
        </div>
      </nav>

      <QuotaBar />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-accent">
          <Avatar className="size-7">
            <AvatarFallback className="bg-bleu-boulga text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{profile?.full_name ?? user?.email ?? "Mon compte"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            Parametres
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} variant="destructive">
            <LogOut className="size-4" />
            Se deconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
