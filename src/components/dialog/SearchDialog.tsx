import { useId, useState } from "react";
import { Autocomplete } from "@/components/Autocomplete";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getLineIdFromStateless } from "@/lib/utils";
import { type LineInfo, type LocationResult, mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";
import type { SavedSelection, SaveLines } from "@/types/storage";

export function SearchDialog() {
  const selectAllId = useId();
  const { closeDialog } = useDialogStore();
  const [savedSelections, _] = useLocalStorage<SavedSelection[]>(
    "mvv.savedSelections",
    [],
  );

  const [selectedStop, setSelectedStop] = useState<LocationResult | null>(null);
  const [availableLines, setAvailableLines] = useState<LineInfo[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  const handleSearchStops = async (query: string): Promise<LocationResult[]> => {
    if (query.length < 4) return [];
    const res = await mvvApi.searchStops(query);
    return res.results;
  };

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
    lines?.map(({ stateless, number, direction }) => (
      <div key={stateless} className="flex items-center gap-2">
        <Checkbox
          id={stateless}
          checked={selectedLines
            .map((id) => getLineIdFromStateless(id))
            .includes(getLineIdFromStateless(stateless))
          }
          onCheckedChange={(checked) => handleLineClick(stateless, !!checked)}
        />
        <Label htmlFor={stateless}>
          [{number}] {direction}
        </Label>
      </div>
    ));

  const saveSelection = () => {
    try {
      if (!selectedStop?.id) throw new Error("Selected stop ID doesn't exist");

      const linesToSave =
        availableLines.length > 0 &&
        selectedLines.length === availableLines?.length
          ? "all"
          : selectedLines;

      const storedSelections = localStorage.getItem("mvv.savedSelections");
      const existing = storedSelections ? JSON.parse(storedSelections) : [];

      const idx = Array.isArray(existing)
        ? existing.findIndex((stop) => stop.id === selectedStop.id)
        : -1;

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
        const existingEntry = existing[idx];
        if (isSameLines(existingEntry.lines, linesToSave)) return;

        // update entry
        const updated = {
          ...existingEntry,
          lines: linesToSave,
          savedAt: new Date().toISOString(),
        };
        const updatedSelections = [...existing];
        updatedSelections[idx] = updated;
        localStorage.setItem(
          "mvv.savedSelections",
          JSON.stringify(updatedSelections),
        );
        // setSavedSelections(updatedSelections);
        closeDialog();
        return;
      }

      // not found -> add new
      const payload = {
        id: selectedStop.id,
        stop: selectedStop,
        lines: linesToSave,
        savedAt: new Date().toISOString(),
      };

      const updatedSelections = [...existing, payload];
      localStorage.setItem(
        "mvv.savedSelections",
        JSON.stringify(updatedSelections),
      );
      // setSavedSelections(updatedSelections);
      closeDialog();
    } catch (err) {
      console.error("Failed to save selection", err);
    }
  };

  return (
    <div className="flex flex-col">
      <div>
        Please specify a maximum of three stops.
        <Autocomplete
          placeholder="Search Stop..."
          debounceTime={300}
          minChars={1}
          fetchData={handleSearchStops}
          renderItem={(item) => item.name}
          getItemValue={(item) => item.name}
          onSelect={handleStopSelect}
        />
        <Button
          type="button"
          onClick={saveSelection}
          disabled={!(selectedStop?.id && selectedLines.length)}
        >
          Save Selection
        </Button>
      </div>
      <div>
        <h3>AvailableLines</h3>
        {!!availableLines.length && (
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
        )}
        <div className="flex flex-col gap-1">
          {renderAvailableLines(availableLines)}
        </div>
      </div>
    </div>
  );
}
