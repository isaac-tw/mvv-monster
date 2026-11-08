import { Download, FileJson, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportConfig, importConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SavedSelection } from "@/types/storage";

export function ConfigDialog({
  onImport,
}: {
  onImport: (selections: SavedSelection[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const { savedSelections } = useSavedSelectionsStore();
  const { closeDialog } = useDialogStore();
  const [pending, setPending] = useState<SavedSelection[] | null>(null);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

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

  const readFiles = async (files: File[]) => {
    if (isReading || files.length === 0) return;
    setPending(null);
    setError("");
    setFileName("");
    if (files.length !== 1) {
      setError("Choose one configuration file at a time.");
      return;
    }
    const file = files[0];
    setFileName(file.name);
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
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gray-600">
        Back up your saved stops and lines, or restore them from a file.
      </p>
      <section
        className="flex items-center justify-between gap-3 rounded-lg border p-3"
        aria-label="Export configuration"
      >
        <div>
          <h3 className="text-sm font-semibold">Export</h3>
          <p className="text-xs text-gray-500 mt-1">
            Download your current setup.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={download}>
          <Download aria-hidden="true" /> Export
        </Button>
      </section>
      <section
        aria-labelledby={`${inputId}-title`}
        className="flex flex-col gap-3"
      >
        <h3 id={`${inputId}-title`} className="text-sm font-semibold">
          Import
        </h3>
        <fieldset
          aria-label="Choose or drop configuration"
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            if (!isReading) setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = isReading ? "none" : "copy";
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepth.current -= 1;
            if (dragDepth.current === 0) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setIsDragging(false);
            void readFiles(Array.from(event.dataTransfer.files));
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:border-blue-600 focus-within:bg-blue-50",
            isDragging
              ? "border-blue-600 bg-blue-50"
              : "border-gray-300 bg-gray-50",
            isReading && "opacity-60",
          )}
        >
          {pending !== null ? (
            <FileJson className="size-7 text-blue-600" aria-hidden="true" />
          ) : (
            <Upload className="size-7 text-gray-400" aria-hidden="true" />
          )}
          <p className="text-sm font-medium">
            {isDragging
              ? "Drop your file here"
              : "Drag and drop your configuration"}
          </p>
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            One JSON file, up to 1 MB
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".json,application/json"
            disabled={isReading}
            className="hidden"
            aria-label="Configuration file"
            aria-describedby={`${inputId}-hint`}
            onChange={(event) => {
              void readFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isReading}
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
          {fileName && (
            <p className="max-w-full break-all text-xs text-gray-600">
              {fileName}
            </p>
          )}
        </fieldset>
      </section>
      {isReading && (
        <output className="text-sm">Reading configuration...</output>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {pending !== null && (
        <div
          className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-gray-700"
          aria-live="polite"
        >
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
          <Upload aria-hidden="true" /> Import configuration
        </Button>
      </div>
    </div>
  );
}
