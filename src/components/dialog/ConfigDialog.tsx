import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { exportConfig, importConfig } from "@/lib/config";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SavedSelection } from "@/types/storage";

export function ConfigDialog({
  onImport,
}: {
  onImport: (selections: SavedSelection[]) => void;
}) {
  const inputId = useId();
  const { savedSelections } = useSavedSelectionsStore();
  const { closeDialog } = useDialogStore();
  const [pending, setPending] = useState<SavedSelection[] | null>(null);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportConfig(savedSelections)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "mvv-monster-config.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const readFile = async (file: File | undefined) => {
    setPending(null);
    setError("");
    if (!file) return;
    setIsReading(true);
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a configuration smaller than 1 MB.");
      setPending(importConfig(await file.text()));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to read this file.",
      );
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Save your stops, selected lines, and their order to a file, or restore
        them on another device.
      </p>
      <Button type="button" variant="outline" onClick={download}>
        Export configuration
      </Button>
      <Label htmlFor={inputId}>Import configuration</Label>
      <input
        id={inputId}
        type="file"
        accept=".json,application/json"
        disabled={isReading}
        onChange={(event) => {
          void readFile(event.target.files?.[0]);
        }}
        className="text-sm w-full"
      />
      {isReading && (
        <output className="text-sm">Reading configuration...</output>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {pending !== null && (
        <div className="text-sm text-gray-600">
          <p>
            Importing {pending.length} saved stops will replace your current{" "}
            {savedSelections.length} saved stops.
          </p>
          {pending.length > 0 ? (
            <ul className="list-disc pl-5 mt-2">
              {pending.map((selection) => (
                <li key={selection.id}>{selection.stop.name}</li>
              ))}
            </ul>
          ) : (
            <p>This will clear all saved stops.</p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={pending === null || isReading}
          onClick={() => {
            if (pending === null) return;
            onImport(pending);
            closeDialog();
          }}
        >
          Replace configuration
        </Button>
      </div>
    </div>
  );
}
