"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_TABS = [
  { value: "/admin", label: "Vue d'ensemble" },
  { value: "/admin/users", label: "Utilisateurs" },
  { value: "/admin/costs", label: "Coûts" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 md:px-8 md:pt-6">
        <Tabs value={pathname} onValueChange={(v) => typeof v === "string" && router.push(v)}>
          <TabsList>
            {ADMIN_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {children}
    </div>
  );
}
