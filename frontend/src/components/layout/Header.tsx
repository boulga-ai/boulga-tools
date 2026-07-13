"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

export function Header() {
  return (
    <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
      <Sheet>
        <SheetTrigger className="flex size-8 items-center justify-center rounded-[8px] hover:bg-accent">
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar className="w-full border-r-0" />
        </SheetContent>
      </Sheet>
      <span className="font-semibold text-marine">Boulga AI</span>
    </header>
  );
}
