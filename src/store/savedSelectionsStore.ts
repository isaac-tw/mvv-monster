import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedSelection } from "@/types/storage";

type SavedSelectionsState = {
  savedSelections: SavedSelection[];
  setSavedSelections: (selections: SavedSelection[]) => void;
};

export const useSavedSelectionsStore = create<SavedSelectionsState>()(
  persist(
    (set) => ({
      savedSelections: [],
      setSavedSelections: (selections) => set({ savedSelections: selections }),
    }),
    {
      name: "mvv.savedSelections",
    }
  )
);
