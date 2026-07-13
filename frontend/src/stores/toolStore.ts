import { create } from "zustand";
import type { CVContent } from "@/lib/document-types";

type OutlineSection = {
  id: string;
  title: string;
  level: number;
  children: OutlineSection[];
};

type ToolState = {
  // Plan genere par le Generateur de plan, repris par le Redacteur de document pro
  // ou le Redacteur academique sans nouvel appel LLM.
  pendingOutline: OutlineSection[] | null;
  setPendingOutline: (outline: OutlineSection[] | null) => void;
  // Dernier CV genere dans la session, reutilisable par "Importer depuis mon CV"
  // sur le Redacteur de lettre de motivation.
  lastCV: CVContent | null;
  setLastCV: (cv: CVContent | null) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  pendingOutline: null,
  setPendingOutline: (outline) => set({ pendingOutline: outline }),
  lastCV: null,
  setLastCV: (cv) => set({ lastCV: cv }),
}));
