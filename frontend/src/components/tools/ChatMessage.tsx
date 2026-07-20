import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  "Expert ✦": "bg-amber-50 text-amber-700",
  Avancé: "bg-blue-50 text-blue-700",
  Pro: "bg-gray-100 text-gray-600",
};

export function ChatMessage({
  role,
  children,
  actions,
  badge,
  isStreaming,
  bare,
}: {
  role: "user" | "assistant";
  children: ReactNode;
  actions?: ReactNode;
  badge?: string;
  isStreaming?: boolean;
  // Pour les cas ou `children` est deja une carte auto-porteuse (bordure, fond, padding —
  // ex. SocialPostCard) : evite le double encadrement et laisse la carte occuper toute la
  // largeur disponible au lieu de la limiter a 90% et de la retrecir a son contenu.
  bare?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-2 duration-200",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1.5",
          isUser
            ? "max-w-[80%] items-end"
            : bare
              ? "w-full items-stretch"
              : "max-w-[90%] items-start",
        )}
      >
        {!isUser && badge && (
          <span
            className={cn(
              "self-end rounded-full px-2 py-0.5 text-xs font-medium",
              BADGE_STYLES[badge] ?? "bg-gray-100 text-gray-600",
            )}
          >
            {badge}
          </span>
        )}
        {bare ? (
          children
        ) : (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "bg-blue-50 text-foreground"
                : "border border-border bg-white text-foreground",
            )}
          >
            {children}
            {isStreaming && (
              <span className="ml-1 inline-flex items-center gap-0.5 align-text-bottom">
                <span className="size-1 animate-pulse rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="size-1 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="size-1 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </span>
            )}
          </div>
        )}
        {actions && (
          <div className="flex flex-wrap gap-1.5">{actions}</div>
        )}
      </div>
    </div>
  );
}
