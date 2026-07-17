export function ToolLayout({
  title,
  description,
  badge,
  children,
  wide = false,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  // Les outils avec un viewer de document dominant (GPTZero-like) ont besoin de plus de
  // largeur que le formulaire etroit des autres outils — n'affecte que l'appelant qui le
  // demande explicitement.
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}
    >
      <div className="flex flex-col gap-1.5">
        {badge}
        <h1>{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
