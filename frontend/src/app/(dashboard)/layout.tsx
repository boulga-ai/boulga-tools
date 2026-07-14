"use client";

import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const COLLAPSE_KEY = "boulga:sidebar-collapsed";

// Le shell doit etre borne a la hauteur de l'ecran (h-screen + overflow-hidden),
// pas seulement min-h-full : sinon rien ne clippe jamais et la fenetre entiere
// scrolle avec la sidebar au lieu de laisser chaque zone (main, et les panels
// internes de chaque outil) scroller independamment.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1",
  );

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    // h-screen SANS flex-1 : combiner les deux sur le meme axe (body est
    // flex-col, donc l'axe principal est la hauteur) fait ignorer h-screen —
    // flex-basis:0% de flex-1 prend le pas sur la propriete height, et cette
    // div retombe sur une taille pilotee par le contenu au lieu d'etre bornee
    // a la fenetre. body (min-h-full, pas de hauteur fixe) laisse alors tout
    // grandir et c'est LE DOCUMENT entier qui scrolle (sidebar comprise) au
    // lieu que ce soit seulement `main`.
    <div className="flex h-screen overflow-hidden">
      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          title="Afficher le menu"
          className="fixed left-2 top-2 z-20 hidden size-8 items-center justify-center rounded-[8px] border bg-card text-muted-foreground hover:bg-accent hover:text-foreground md:flex"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      ) : (
        <Sidebar className="hidden md:flex" onCollapse={toggle} />
      )}
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-fond-neutre">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
