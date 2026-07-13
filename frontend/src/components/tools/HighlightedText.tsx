type Span = { start: number; end: number };

export function HighlightedText({ text, spans }: { text: string; spans: Span[] }) {
  if (spans.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((span, i) => {
    if (span.start > cursor) parts.push(text.slice(cursor, span.start));
    parts.push(
      <mark key={i} className="rounded-[2px] bg-attention/25 px-0.5">
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = Math.max(cursor, span.end);
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
