import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar className="hidden md:flex" />
      <div className="flex min-h-full flex-1 flex-col bg-fond-neutre">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
