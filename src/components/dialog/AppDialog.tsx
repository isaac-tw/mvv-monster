import { useDialogStore } from "@/store/dialogStore";

export function AppDialog() {
  const { isOpen, component, closeDialog } = useDialogStore();
  if (!isOpen || !component) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-4 rounded shadow-lg">
        {component}
        <button type="button" onClick={closeDialog}>Close</button>
      </div>
    </div>
  );
}
