export function ToolLayout({
  title,
  description,
  badge,
  children,
  wide = false,
}: {
  // Optionnels : certains outils (ex. Posts reseaux sociaux, deja nommes dans la sidebar
  // et dont l'interface est une appli chat auto-porteuse) n'ont pas besoin de repeter un
  // titre/sous-titre qui ne fait que grignoter la hauteur disponible.
  title?: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  // Les outils avec un viewer de document dominant (GPTZero-like) ont besoin de plus de
  // largeur que le formulaire etroit des autres outils — n'affecte que l'appelant qui le
  // demande explicitement.
  wide?: boolean;
}) {
  const hasHeader = badge || title || description;
  return (
    <div
      className={`mx-auto flex w-full min-h-0 flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}
    >
      {hasHeader && (
        <div className="flex flex-col gap-1.5">
          {badge}
          {title && <h1>{title}</h1>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
