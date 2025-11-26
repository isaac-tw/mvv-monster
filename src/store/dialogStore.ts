import type { ReactNode } from "react";
import { create } from "zustand";

type DialogState = {
  isOpen: boolean;
  component: ReactNode | null;
  title: string | null;
  openDialog: (component: ReactNode, title?: string | null) => void;
  closeDialog: () => void;
};

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  component: null,
  title: null,
  openDialog: (component, title = null) => set({ isOpen: true, component, title }),
  closeDialog: () => set({ isOpen: false, component: null, title: null }),
}));
