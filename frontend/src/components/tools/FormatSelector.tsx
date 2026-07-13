import { cn } from "@/lib/utils";

export function FormatSelector({
  value,
  onChange,
}: {
  value: "docx" | "pdf";
  onChange: (value: "docx" | "pdf") => void;
}) {
  const options: { value: "docx" | "pdf"; label: string }[] = [
    { value: "pdf", label: "PDF" },
    { value: "docx", label: "Word (.docx)" },
  ];

  return (
    <div className="inline-flex rounded-[8px] border p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value ? "bg-bleu-boulga text-white" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
