import type { CVContent, CoverLetterContent } from "@/lib/document-types";

export function CVPreview({ content }: { content: CVContent }) {
  return (
    <div className="flex flex-col gap-4 rounded-[12px] border bg-card p-5 text-sm">
      <div>
        <h3 className="text-marine">{content.full_name}</h3>
        <p className="text-bleu-boulga">{content.title}</p>
        <p className="text-xs text-muted-foreground">
          {[content.contact.email, content.contact.phone, content.contact.address]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {content.summary && <p className="italic text-muted-foreground">{content.summary}</p>}

      {content.experiences.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Experience</p>
          {content.experiences.map((exp, i) => (
            <div key={i} className="mb-2">
              <p className="font-medium">
                {exp.title} — {exp.company}
              </p>
              <p className="text-xs text-muted-foreground">
                {exp.start_date} - {exp.end_date || "present"}
              </p>
              <p>{exp.description}</p>
            </div>
          ))}
        </div>
      )}

      {content.education.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Formation</p>
          {content.education.map((edu, i) => (
            <p key={i}>
              {edu.degree} — {edu.institution} ({edu.year})
            </p>
          ))}
        </div>
      )}

      {content.skills.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Competences</p>
          <p>{content.skills.join(", ")}</p>
        </div>
      )}
    </div>
  );
}

export function CoverLetterPreview({ content }: { content: CoverLetterContent }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border bg-card p-5 text-sm">
      <div>
        <p className="font-medium">{content.full_name}</p>
        <p className="text-xs text-muted-foreground">{content.contact.email}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {content.recipient_name && `${content.recipient_name} · `}
        {content.company_name} · {content.date}
      </p>
      <p className="font-medium text-bleu-boulga">{content.subject}</p>
      <p>{content.greeting}</p>
      {content.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <p>{content.closing}</p>
      <p className="font-medium">{content.signature}</p>
    </div>
  );
}
