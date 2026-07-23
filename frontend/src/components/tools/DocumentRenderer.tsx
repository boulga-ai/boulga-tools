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

const HEADING_SIZE_CLASSES = ["text-xl font-semibold mt-4", "text-lg font-semibold mt-3", "text-base font-semibold mt-2", "text-sm font-semibold mt-2"];

function BlockView({
  block,
  index,
  coverStyle,
  letterBanner,
  accentHex,
  darkHex,
  isCv,
  headings,
  tocLinks,
  photoPreviewUrl,
}: {
  block: DocBlock;
  index: number;
  coverStyle: CoverStyle;
  letterBanner: boolean;
  accentHex: string;
  darkHex: string;
  isCv: boolean;
  headings: { text: string; level: number; anchor: string }[];
  tocLinks: boolean;
  // URL signee (apercu seulement, jamais envoyee au backend) d'une photo/logo deja
  // televerse — voir PhotoUpload/DocumentWorkspace. Affichee uniquement sur le bloc
  // contact (cv) ou cover_page (pro_doc/academic), miroir du .docx (renderer.py).
  photoPreviewUrl?: string;
}) {
  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(block.level) || 1, 1), 4);
      const text = asStr(block.text);
      // Ancre posee uniquement quand tocLinks est actif (modale "Agrandir") : la
      // miniature de carte reste toujours montee en parallele avec les memes blocs,
      // poser l'id partout dupliquerait des ids dans le DOM des que la modale s'ouvre.
      const anchor = tocLinks ? `heading-${index}` : undefined;
      if (isCv) {
        // Miroir de _render_heading_in_container (renderer.py) : majuscules, gras,
        // couleur d'accent du template — jamais le style "titre" generique utilise
        // ailleurs (pro_doc/academic/lettre).
        const Tag = level === 1 ? "h2" : level === 2 ? "h3" : level === 3 ? "h4" : "h5";
        return (
          <Tag id={anchor} className="mt-2.5 text-sm font-bold uppercase tracking-wide" style={{ color: accentHex }}>
            {text}
          </Tag>
        );
      }
      // Miroir de _render_heading : niveau 1 en couleur d'accent, niveaux suivants en
      // couleur sombre (richesse du palier ignoree ici, voir note du fichier).
      const className = HEADING_SIZE_CLASSES[level - 1];
      const color = level === 1 ? accentHex : darkHex;
      if (level === 1) return <h2 id={anchor} className={className} style={{ color }}>{text}</h2>;
      if (level === 2) return <h3 id={anchor} className={className} style={{ color }}>{text}</h3>;
      if (level === 3) return <h4 id={anchor} className={className} style={{ color }}>{text}</h4>;
      return <h5 id={anchor} className={className} style={{ color }}>{text}</h5>;
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
                  <th key={i} className="px-2 py-1.5 text-left font-medium text-white" style={{ backgroundColor: accentHex }}>
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
        <blockquote
          className="bg-blue-50/60 py-1.5 pl-3 text-sm italic text-muted-foreground"
          style={{ borderLeft: `4px solid ${accentHex}` }}
        >
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
          {photoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signee externe (Supabase Storage)
            <img src={photoPreviewUrl} alt="" className="mb-2 size-16 rounded-full object-cover" />
          )}
          <h2 className="text-xl font-semibold" style={{ color: darkHex }}>
            {asStr(block.full_name) || "—"}
          </h2>
          {block.title ? <p style={{ color: accentHex }}>{asStr(block.title)}</p> : null}
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
          <p className="text-sm font-semibold">
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
          <p className="text-sm font-semibold">
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
          <div className="-m-5 mb-2 flex flex-col gap-0.5 px-5 py-4 text-white" style={{ backgroundColor: darkHex }}>
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
      return (
        <p className="font-medium" style={{ color: accentHex }}>
          {asStr(block.text)}
        </p>
      );
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
          <div className="-m-5 mb-2 flex flex-col gap-1 px-5 py-6 text-white" style={{ backgroundColor: accentHex }}>
            <h2 className="text-2xl font-semibold">{asStr(block.title)}</h2>
            {metaBits.length > 0 ? <p className="text-sm text-white/85">{metaBits.join(" | ")}</p> : null}
            {photoPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL signee externe (Supabase Storage)
              <img src={photoPreviewUrl} alt="" className="mt-2 h-12 w-auto rounded-[4px] object-contain" />
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-1 py-8 text-center">
          {photoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signee externe (Supabase Storage)
            <img src={photoPreviewUrl} alt="" className="mb-2 h-16 w-auto object-contain" />
          )}
          <h2 className="text-2xl font-semibold" style={{ color: darkHex }}>
            {asStr(block.title)}
          </h2>
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
      // Cliquable uniquement dans la modale (tocLinks) — dans la miniature de carte
      // (recadree, pointer-events-none), un lien resterait de toute facon inerte.
      if (tocLinks && headings.length > 0) {
        return (
          <nav className="flex flex-col gap-0.5">
            {headings.map((h) => (
              <a
                key={h.anchor}
                href={`#${h.anchor}`}
                style={{ paddingLeft: `${(h.level - 1) * 14}px`, color: accentHex }}
                className="truncate text-sm hover:underline"
              >
                {h.text}
              </a>
            ))}
          </nav>
        );
      }
      return <p className="text-sm italic text-muted-foreground">[Sommaire — généré automatiquement au téléchargement]</p>;
    case "bibliography":
      // isCv (Publications, cv_academique) reste neutre — miroir de
      // _render_bibliography_in_container (renderer.py), qui ne colore jamais ce
      // libelle contrairement a _render_bibliography (pro_doc/academic).
      return (
        <div className="mt-2">
          <p
            className="text-xs font-medium uppercase text-muted-foreground"
            style={isCv ? undefined : { color: darkHex }}
          >
            {isCv ? "Publications" : "Bibliographie"}
          </p>
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
function SidebarBlockView({ block, photoPreviewUrl }: { block: DocBlock; photoPreviewUrl?: string }) {
  switch (block.type) {
    case "contact": {
      const bits = [asStr(block.email), asStr(block.phone), asStr(block.address), asStr(block.linkedin)].filter(Boolean);
      return (
        <div>
          {photoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signee externe (Supabase Storage)
            <img src={photoPreviewUrl} alt="" className="mx-auto mb-2 size-16 rounded-full object-cover" />
          )}
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
  accentColorOverride,
  darkColorOverride,
  tocLinks = false,
  photoPreviewUrl,
}: {
  blocks: DocBlock[];
  template?: string;
  className?: string;
  // Couleurs choisies par le user (palette curatee, voir lib/accent-palette.ts) —
  // sans "#". accentColorOverride remplace accentHex, darkColorOverride remplace
  // darkHex (nom/elements secondaires, et fond des templates a sidebar/bandeau) —
  // jamais le fond blanc de la carte elle-meme. Meme regle que backend
  // renderer.render(accent_override, dark_override).
  accentColorOverride?: string;
  darkColorOverride?: string;
  // Active les ancres sur les headings et rend le bloc table_of_contents cliquable
  // (voir BlockView) — reserve a la modale "Agrandir" (PageResultCard), jamais a la
  // miniature de carte qui reste montee en parallele avec les memes blocs (sinon
  // ids dupliques dans le DOM).
  tocLinks?: boolean;
  // URL signee (apercu seulement) d'une photo/logo deja televerse — voir
  // PhotoUpload/DocumentWorkspace. Jamais derivee des blocs eux-memes (qui ne
  // portent qu'un chemin Storage prive, pas affichable directement) : c'est le
  // parent qui la fournit, la meme pour toutes les cartes du projet en cours.
  photoPreviewUrl?: string;
}) {
  const baseStyle = getTemplateStyle(template);
  const style = {
    ...baseStyle,
    accentHex: accentColorOverride ? `#${accentColorOverride}` : baseStyle.accentHex,
    darkHex: darkColorOverride ? `#${darkColorOverride}` : baseStyle.darkHex,
  };
  // "contact" n'existe que dans le vocabulaire de blocs du CV (voir backend
  // DOCUMENT_SCHEMAS) — signal fiable pour choisir la mise en forme des titres
  // (majuscules, voir BlockView) sans avoir a faire remonter le doc_type ici.
  const isCv = blocks.some((b) => b.type === "contact");
  // Sommaire cliquable (pro_doc/academic) : liste plate des headings, ancre stable
  // basee sur la position du bloc dans le document — calculee une seule fois,
  // reutilisee pour l'ancre posee sur chaque heading ET pour le bloc
  // table_of_contents lui-meme.
  const headings = blocks
    .map((b, i) => ({ block: b, index: i }))
    .filter(({ block }) => block.type === "heading")
    .map(({ block, index }) => ({
      text: asStr(block.text),
      level: Math.min(Math.max(Number(block.level) || 1, 1), 4),
      anchor: `heading-${index}`,
    }));

  if (style.cvSidebar) {
    const sidebarBlocks = blocks.filter((b) => CV_SIDEBAR_BLOCK_TYPES.has(b.type));
    const mainBlocks = blocks.filter((b) => !CV_SIDEBAR_BLOCK_TYPES.has(b.type));
    return (
      <div className={cn("flex overflow-hidden rounded-[12px] border", className)} style={{ fontFamily: style.fontFamily }}>
        <div className="flex w-[38%] shrink-0 flex-col gap-1.5 p-4" style={{ backgroundColor: style.darkHex }}>
          {sidebarBlocks.map((block, i) => (
            <SidebarBlockView key={i} block={block} photoPreviewUrl={photoPreviewUrl} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 bg-card p-5">
          {mainBlocks.map((block, i) => (
            <BlockView
              key={i}
              block={block}
              index={i}
              coverStyle={style.coverStyle}
              letterBanner={style.letterBanner}
              accentHex={style.accentHex}
              darkHex={style.darkHex}
              isCv={isCv}
              headings={headings}
              tocLinks={tocLinks}
              photoPreviewUrl={photoPreviewUrl}
            />
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
        <BlockView
          key={i}
          block={block}
          index={i}
          coverStyle={style.coverStyle}
          letterBanner={style.letterBanner}
          accentHex={style.accentHex}
          darkHex={style.darkHex}
          isCv={isCv}
          headings={headings}
          tocLinks={tocLinks}
          photoPreviewUrl={photoPreviewUrl}
        />
      ))}
    </div>
  );
}
