import { Fragment } from "react";
import { PLATFORMS } from "@/components/tools/PlatformChips";

const PLATFORM_BORDER_COLOR: Record<string, string> = {
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  twitter: "#000000",
  instagram: "#E1306C",
  whatsapp: "#25D366",
  tiktok: "#000000",
};

const HASHTAG_RE = /(#[\p{L}0-9_]+)/gu;

function renderContent(content: string) {
  const parts = content.split(HASHTAG_RE);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="font-medium text-bleu-boulga">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function SocialPostCard({
  content,
  platform,
  isStreaming,
}: {
  content: string;
  platform: string;
  isStreaming?: boolean;
}) {
  const info = PLATFORMS.find((p) => p.value === platform);
  const Icon = info?.icon;
  const overLimit = platform === "twitter" && content.length > 280;

  return (
    <div
      className="flex flex-col gap-2 rounded-[12px] border-l-4 bg-white p-4"
      style={{ borderLeftColor: PLATFORM_BORDER_COLOR[platform] ?? "#94a3b8" }}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {info?.label ?? platform}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {renderContent(content)}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-bleu-boulga align-text-bottom" />
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {content.length.toLocaleString("fr-FR")} caractères
        {overLimit && (
          <span className="ml-1 text-destructive">(dépasse la limite X de 280)</span>
        )}
      </p>
    </div>
  );
}
