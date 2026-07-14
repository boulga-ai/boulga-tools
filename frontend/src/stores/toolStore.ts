import { create } from "zustand";
import type { DocBlock } from "@/types/document-engine";

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
  // Blocs du dernier CV genere dans la session, reutilisables par "Importer depuis
  // mon CV" sur le Redacteur de lettre de motivation.
  lastCVBlocks: DocBlock[] | null;
  setLastCVBlocks: (blocks: DocBlock[] | null) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  pendingOutline: null,
  setPendingOutline: (outline) => set({ pendingOutline: outline }),
  lastCVBlocks: null,
  setLastCVBlocks: (blocks) => set({ lastCVBlocks: blocks }),
}));
