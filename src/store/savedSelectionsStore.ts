import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedSelection } from "@/types/storage";

type SavedSelectionsState = {
  savedSelections: SavedSelection[];
  setSavedSelections: (selections: SavedSelection[]) => void;
  isLoading: boolean;
};

export const useSavedSelectionsStore = create<SavedSelectionsState>()(
  persist(
    (set) => ({
      savedSelections: [],
      setSavedSelections: (selections) => set({ savedSelections: selections }),
      isLoading: true,
    }),
    {
      name: "mvv.savedSelections",
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false;
      },
    }
  )
);
