import { useCallback, useId, useState } from "react";
import { Autocomplete } from "@/components/Autocomplete";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getLineColors } from "@/lib/line-colors";
import { getLineIdFromStateless } from "@/lib/utils";
import { type LineInfo, type LocationResult, mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SaveLines } from "@/types/storage";

export function SearchDialog() {
  const selectAllId = useId();
  const { closeDialog } = useDialogStore();
  const { savedSelections, setSavedSelections } = useSavedSelectionsStore();

  const [selectedStop, setSelectedStop] = useState<LocationResult | null>(null);
  const [availableLines, setAvailableLines] = useState<LineInfo[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  const handleSearchStops = useCallback(
    async (query: string): Promise<LocationResult[]> => {
      if (query.length < 4) return [];
      const res = await mvvApi.searchStops(query);
      return res.results;
    },
    [],
  );

  const handleStopSelect = async (item: LocationResult): Promise<void> => {
    setSelectedStop(item);

    const res = await mvvApi.getAvailableLines(item.id);
    setAvailableLines(res.lines);

    const foundSelection = savedSelections.find((selection) => selection.id === item?.id);
    if (!foundSelection) return;
    if (foundSelection.lines === "all") handleSelectAll(true);
    else setSelectedLines(foundSelection.lines);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = (availableLines || []).map((line) => line.stateless);
      setSelectedLines(ids);
      return;
    }

    setSelectedLines([]);
  };

  // The stateless ID changed today for some lines (only the last part differs).
  // e.g. "swm:03134:G:H:015" -> "swm:03134:G:H:016"
  // However, the departures response appears unaffected by this change.
  // We now ignore the last part (using getLineIdFromStateless) when rendering checkboxes
  // to prevent them from appearing unchecked due to the ID change.
  const handleLineClick = (lineId: string, checked: boolean) => {
    setSelectedLines((prev) =>
      checked
        ? [...prev, lineId]
        : prev.filter((id) => getLineIdFromStateless(id) !== getLineIdFromStateless(lineId))
    );
  };

  const renderAvailableLines = (lines: LineInfo[]) =>
    lines?.map((line) => {
      const { stateless, number, direction } = line;
      return (
        <div key={stateless} className="flex items-center gap-2">
          <Checkbox
            id={stateless}
            checked={selectedLines
              .map((id) => getLineIdFromStateless(id))
              .includes(getLineIdFromStateless(stateless))}
            onCheckedChange={(checked) => handleLineClick(stateless, !!checked)}
          />
          <Label htmlFor={stateless}>
            <span
              className="font-bold rounded px-1.5 py-0.5 text-sm"
              style={{
                backgroundColor: getLineColors(line).background,
                color: getLineColors(line).text,
              }}
            >
              {number}
            </span>
            <span className="text-sm text-gray-700">{direction}</span>
          </Label>
        </div>
      );
    });

  const saveSelection = () => {
    try {
      if (!selectedStop?.id) throw new Error("Selected stop ID doesn't exist");

      const linesToSave =
        availableLines.length > 0 &&
        selectedLines.length === availableLines?.length
          ? "all"
          : selectedLines;

      const idx = savedSelections.findIndex((stop) => stop.id === selectedStop.id);

      const isSameLines = (linesA: SaveLines, linesB: SaveLines): boolean => {
        if (linesA === "all" && linesB === "all") return true;
        if (Array.isArray(linesA) && Array.isArray(linesB)) {
          if (linesA.length !== linesB.length) return false;
          const setA = new Set(linesA);
          return linesB.every((line) => setA.has(line));
        }
        return false;
      };

      if (idx !== -1) {
        // existing saved stop found
        const existingEntry = savedSelections[idx];
        if (isSameLines(existingEntry.lines, linesToSave)) return;

        // update entry
        const updated = {
          ...existingEntry,
          lines: linesToSave,
          savedAt: new Date().toISOString(),
        } as const;
        const updatedSelections = [...savedSelections];
        updatedSelections[idx] = updated;

        setSavedSelections(updatedSelections);
        closeDialog();
        return;
      }

      // not found -> add new
      const payload = {
        id: selectedStop.id,
        stop: selectedStop,
        lines: linesToSave,
        savedAt: new Date().toISOString(),
      } as const;

      const updatedSelections = [...savedSelections, payload];

      setSavedSelections(updatedSelections);
      closeDialog();
    } catch (err) {
      console.error("Failed to save selection", err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Autocomplete
        placeholder="Search Stop..."
        debounceTime={300}
        minChars={1}
        fetchData={handleSearchStops}
        renderItem={(item) => item.name}
        getItemValue={(item) => item.name}
        onSelect={handleStopSelect}
      />
      <div>
        {!!availableLines.length && (
          <div className="mb-2 border-b">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Available Lines
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id={selectAllId}
                checked={
                  availableLines.length > 0 &&
                  selectedLines.length === availableLines.length
                }
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
              <Label htmlFor={selectAllId}>Select All</Label>
            </div>
          </div>
        )}
        {availableLines.length === 0
          ? (
            <div className="text-sm text-gray-500 text-center py-12 bg-gray-50 rounded-lg">
              Search for a stop to see available lines
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
              {renderAvailableLines(availableLines)}
            </div>
          )}
      </div>
      <Button
        className="w-full"
        type="button"
        onClick={saveSelection}
        disabled={!(selectedStop?.id && selectedLines.length)}
      >
        Save Selection
      </Button>
    </div>
  );
}
