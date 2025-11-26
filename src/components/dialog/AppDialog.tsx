import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogStore } from "@/store/dialogStore";

export function AppDialog() {
  const { isOpen, component, closeDialog, title } = useDialogStore();
  if (!isOpen || !component) return null;

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title || "Dialog"}</DialogTitle>
          <DialogDescription>{/* TODO: Add a description */}</DialogDescription>
        </DialogHeader>
        {component}
      </DialogContent>
    </Dialog>
  );
}
