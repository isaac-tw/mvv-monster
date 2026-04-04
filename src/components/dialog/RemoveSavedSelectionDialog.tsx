import { Button } from "@/components/ui/button";
import { useDialogStore } from "@/store/dialogStore";

type RemoveSavedSelectionDialogProps = {
  stopName: string;
  onConfirm: () => void;
};

export function RemoveSavedSelectionDialog({
  stopName,
  onConfirm,
}: RemoveSavedSelectionDialogProps) {
  const { closeDialog } = useDialogStore();

  const handleConfirm = () => {
    onConfirm();
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">
        Remove <span className="font-medium text-red-600">{stopName}</span>{" "}
        from your saved routes?
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={handleConfirm}>
          Remove Route
        </Button>
      </div>
    </div>
  );
}
