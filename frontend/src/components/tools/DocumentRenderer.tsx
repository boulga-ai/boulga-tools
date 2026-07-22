"use client";

import { cn } from "@/lib/utils";
import { CV_SIDEBAR_BLOCK_TYPES, getTemplateStyle, type CoverStyle } from "@/lib/template-styles";
import type { DocBlock } from "@/types/document-engine";

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

const HEADING_CLASSES = [
  "text-xl font-semibold text-marine mt-4",
  "text-lg font-semibold text-marine mt-3",
  "text-base font-semibold mt-2",
  "text-sm font-semibold mt-2",
];

function BlockView({
  block,
  coverStyle,
  letterBanner,
}: {
  block: DocBlock;
  coverStyle: CoverStyle;
  letterBanner: boolean;
}) {
  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(block.level) || 1, 1), 4);
      const text = asStr(block.text);
      const className = HEADING_CLASSES[level - 1];
      if (level === 1) return <h2 className={className}>{text}</h2>;
      if (level === 2) return <h3 className={className}>{text}</h3>;
      if (level === 3) return <h4 className={className}>{text}</h4>;
      return <h5 className={className}>{text}</h5>;
    }
    case "paragraph":
      return <p className="text-sm leading-relaxed">{asStr(block.text)}</p>;
    case "bullet_list":
      return (
        <ul className="list-disc pl-5 text-sm">
          {asArr(block.items).map((item, i) => (
            <li key={i}>{asStr(item)}</li>
          ))}
        </ul>
      );
    case "numbered_list":
      return (
        <ol className="list-decimal pl-5 text-sm">
          {asArr(block.items).map((item, i) => (
            <li key={i}>{asStr(item)}</li>
          ))}
        </ol>
      );
    case "table": {
      const headers = asArr(block.headers).map((h) => asStr(h));
      const rows = asArr(block.rows) as unknown[][];
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="bg-bleu-boulga px-2 py-1.5 text-left font-medium text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? "bg-muted/50" : undefined}>
                  {asArr(row).map((cell, ci) => (
                    <td key={ci} className="border-b px-2 py-1.5">
                      {asStr(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption ? <p className="mt-1 text-xs italic text-muted-foreground">{asStr(block.caption)}</p> : null}
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-4 border-bleu-boulga bg-blue-50/60 py-1.5 pl-3 text-sm italic text-muted-foreground">
          {asStr(block.text)}
        </blockquote>
      );
    case "spacer":
      return <div className="h-3" />;
    case "page_break":
      return <div className="my-3 border-t border-dashed" />;
    case "contact": {
      const bits = [asStr(block.email), asStr(block.phone), asStr(block.address), asStr(block.linkedin)].filter(Boolean);
      // Etat civil (cv_concours) : ignoré silencieusement si absent, comme au rendu final.
      const civilBits = [
        block.birth_date || block.birth_place
          ? `Né(e) le ${asStr(block.birth_date)}${block.birth_place ? ` à ${asStr(block.birth_place)}` : ""}`
          : "",
        block.nationality ? `Nationalité : ${asStr(block.nationality)}` : "",
      ].filter(Boolean);
      return (
        <div>
          <h2 className="text-xl font-semibold text-marine">{asStr(block.full_name) || "—"}</h2>
          {block.title ? <p className="text-bleu-boulga">{asStr(block.title)}</p> : null}
          <p className="text-xs text-muted-foreground">{bits.join(" · ")}</p>
          {civilBits.length > 0 && <p className="text-xs text-muted-foreground">{civilBits.join(" · ")}</p>}
        </div>
      );
    }
    case "summary":
      return <p className="text-sm italic text-muted-foreground">{asStr(block.text)}</p>;
    case "experience": {
      const period = [asStr(block.start), asStr(block.end) || "présent"].filter(Boolean).join(" – ");
      return (
        <div className="mt-2">
          <p className="text-sm font-medium">
            {asStr(block.position)}
            {block.company ? ` — ${asStr(block.company)}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {period}
            {block.location ? ` · ${asStr(block.location)}` : ""}
          </p>
          {block.description ? <p className="text-sm">{asStr(block.description)}</p> : null}
          {asArr(block.achievements).length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {asArr(block.achievements).map((a, i) => (
                <li key={i}>{asStr(a)}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "education":
      return (
        <div className="mt-2">
          <p className="text-sm font-medium">
            {asStr(block.degree)}
            {block.institution ? ` — ${asStr(block.institution)}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {asStr(block.year)}
            {block.location ? ` · ${asStr(block.location)}` : ""}
          </p>
          {block.details ? <p className="text-sm">{asStr(block.details)}</p> : null}
        </div>
      );
    case "skill_group":
      return (
        <div className="mt-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">{asStr(block.label) || "Compétences"}</p>
          <p className="text-sm">{asArr(block.skills).map((s) => asStr(s)).join(", ")}</p>
        </div>
      );
    case "language_group":
      return (
        <div className="mt-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Langues</p>
          <p className="text-sm">
            {asArr(block.languages)
              .map((l) => {
                const lang = l as { language?: string; level?: string };
                return [lang.language, lang.level].filter(Boolean).join(" — ");
              })
              .join(", ")}
          </p>
        </div>
      );
    case "letter_header": {
      const contact = asArr(block.sender_contact).map((c) => asStr(c));
      const recipientLine = [asStr(block.recipient_name), asStr(block.recipient_title), asStr(block.company_name)]
        .filter(Boolean)
        .join(" · ");
      const dateLine = [asStr(block.place), asStr(block.date)].filter(Boolean).join(", ");
      if (letterBanner) {
        return (
          <div className="-m-5 mb-2 flex flex-col gap-0.5 bg-marine px-5 py-4 text-white">
            <p className="text-lg font-semibold">{asStr(block.sender_name)}</p>
            {contact.map((c, i) => (
              <p key={i} className="text-xs text-white/80">
                {c}
              </p>
            ))}
            <div className="mt-2 flex flex-wrap justify-between text-xs text-white/80">
              <span>{recipientLine}</span>
              <span>{dateLine}</span>
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-0.5 text-sm">
          <p className="font-medium">{asStr(block.sender_name)}</p>
          {contact.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {c}
            </p>
          ))}
          <div className="mt-2 flex flex-wrap justify-between text-xs text-muted-foreground">
            <span>{recipientLine}</span>
            <span>{dateLine}</span>
          </div>
        </div>
      );
    }
    case "subject":
      return <p className="font-medium text-bleu-boulga">{asStr(block.text)}</p>;
    case "signature":
      return (
        <div className="mt-2 text-right text-sm">
          <p>{asStr(block.closing) || "Cordialement,"}</p>
          <p className="font-medium">{asStr(block.name)}</p>
        </div>
      );
    case "cover_page": {
      const extra = (block.extra ?? {}) as Record<string, string>;
      const metaEntries = Object.entries(extra).filter(([, v]) => v);
      if (coverStyle === "banner") {
        const metaBits = [asStr(block.author), asStr(block.institution), asStr(block.date), ...Object.values(extra)].filter(
          Boolean,
        );
        return (
          <div className="-m-5 mb-2 flex flex-col gap-1 bg-bleu-boulga px-5 py-6 text-white">
            <h2 className="text-2xl font-semibold">{asStr(block.title)}</h2>
            {metaBits.length > 0 ? <p className="text-sm text-white/85">{metaBits.join(" | ")}</p> : null}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-1 py-8 text-center">
          <h2 className="text-2xl font-semibold text-marine">{asStr(block.title)}</h2>
          {block.author ? <p>{asStr(block.author)}</p> : null}
          {block.institution ? <p className="text-sm text-muted-foreground">{asStr(block.institution)}</p> : null}
          {block.supervisor ? (
            <p className="text-sm text-muted-foreground">Sous la direction de {asStr(block.supervisor)}</p>
          ) : null}
          {block.date ? <p className="text-sm text-muted-foreground">{asStr(block.date)}</p> : null}
          {metaEntries.map(([k, v]) => (
            <p key={k} className="text-xs text-muted-foreground">
              {k} : {v}
            </p>
          ))}
        </div>
      );
    }
    case "table_of_contents":
      return <p className="text-sm italic text-muted-foreground">[Sommaire — généré automatiquement au téléchargement]</p>;
    case "bibliography":
      return (
        <div className="mt-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Bibliographie</p>
          <ul className="list-disc pl-5 text-sm">
            {asArr(block.entries).map((e, i) => (
              <li key={i}>{asStr(e)}</li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}

// Variante sidebar (CV moderne) des 3 blocs autorises dans la colonne sombre — memes
// types que CV_SIDEBAR_BLOCK_TYPES (lib/template-styles.ts), qui doit rester
// synchronise avec sidebar_types cote backend (renderer.py, _render_cv_sidebar).
function SidebarBlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "contact": {
      const bits = [asStr(block.email), asStr(block.phone), asStr(block.address), asStr(block.linkedin)].filter(Boolean);
      return (
        <div>
          <h2 className="text-lg font-semibold text-white">{asStr(block.full_name) || "—"}</h2>
          {block.title ? <p className="text-sm text-white/85">{asStr(block.title)}</p> : null}
          <div className="mt-1 flex flex-col gap-0.5">
            {bits.map((b, i) => (
              <p key={i} className="text-xs text-white/70">
                {b}
              </p>
            ))}
          </div>
        </div>
      );
    }
    case "skill_group":
      return (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase text-white/70">{asStr(block.label) || "Compétences"}</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-white/90">
            {asArr(block.skills).map((s, i) => (
              <li key={i}>{asStr(s)}</li>
            ))}
          </ul>
        </div>
      );
    case "language_group":
      return (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase text-white/70">Langues</p>
          <div className="mt-1 flex flex-col gap-0.5 text-sm text-white/90">
            {asArr(block.languages).map((l, i) => {
              const lang = l as { language?: string; level?: string };
              return <p key={i}>{[lang.language, lang.level].filter(Boolean).join(" — ")}</p>;
            })}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function DocumentRenderer({
  blocks,
  template,
  className,
}: {
  blocks: DocBlock[];
  template?: string;
  className?: string;
}) {
  const style = getTemplateStyle(template);

  if (style.cvSidebar) {
    const sidebarBlocks = blocks.filter((b) => CV_SIDEBAR_BLOCK_TYPES.has(b.type));
    const mainBlocks = blocks.filter((b) => !CV_SIDEBAR_BLOCK_TYPES.has(b.type));
    return (
      <div className={cn("flex overflow-hidden rounded-[12px] border", className)} style={{ fontFamily: style.fontFamily }}>
        <div className="flex w-[38%] shrink-0 flex-col gap-1.5 bg-marine p-4">
          {sidebarBlocks.map((block, i) => (
            <SidebarBlockView key={i} block={block} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 bg-card p-5">
          {mainBlocks.map((block, i) => (
            <BlockView key={i} block={block} coverStyle={style.coverStyle} letterBanner={style.letterBanner} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-1.5 overflow-hidden rounded-[12px] border bg-card p-5", className)}
      style={{ fontFamily: style.fontFamily }}
    >
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} coverStyle={style.coverStyle} letterBanner={style.letterBanner} />
      ))}
    </div>
  );
}
