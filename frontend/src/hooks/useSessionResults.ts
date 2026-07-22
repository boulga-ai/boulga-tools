"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Liste de resultats persistee en sessionStorage (survit a un refresh, pas a la
// fermeture de l'onglet) — utilise par le Convertisseur et par le Redacteur de
// CV/Lettre (fil de plusieurs generations dans un meme projet, jamais ecrasees).
export function useSessionResults<T>(key: string): [T[], Dispatch<SetStateAction<T[]>>] {
  const [state, setState] = useState<T[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota depasse ou sessionStorage indisponible : pas bloquant
    }
  }, [key, state]);

  return [state, setState];
}
