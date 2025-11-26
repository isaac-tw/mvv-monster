import type { ReactNode } from "react";
import { create } from "zustand";

type DialogState = {
  isOpen: boolean;
  component: ReactNode | null;
  openDialog: (component: ReactNode) => void;
  closeDialog: () => void;
};

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  component: null,
  openDialog: (component) => set({ isOpen: true, component }),
  closeDialog: () => set({ isOpen: false, component: null }),
}));
