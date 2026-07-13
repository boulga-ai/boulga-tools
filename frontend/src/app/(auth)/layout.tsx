export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-fond-neutre px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-marine">Boulga AI</h1>
        <p className="text-muted-foreground text-sm">Puiser l&apos;intelligence qu&apos;il vous faut</p>
      </div>
      <div className="w-full max-w-sm rounded-[12px] border bg-card p-6 shadow-sm">{children}</div>
    </div>
  );
}
