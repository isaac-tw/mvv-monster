import { createFileRoute } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Autocomplete } from "@/components/Autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { mvvApi } from "@/services/mvv-service";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const [selectedStop, setSelectedStop] = useState({});
  const [availableLines, setAvailableLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [departures, setDepartures] = useState([]);
  const [savedSelections, setSavedSelections] = useState([]);

  const selectAllId = useId();

  useEffect(() => {
    try {
      const storedSelections = localStorage.getItem("mvv.savedSelections");
      if (!storedSelections) return;
      const parsed = JSON.parse(storedSelections);
      if (Array.isArray(parsed)) setSavedSelections(parsed);
    } catch (err) {
      console.warn("Failed to load saved selections", err);
    }
  }, []);

  const removeSavedSelection = (id) => {
    const updatedSelections = savedSelections.filter((selection) => selection.id !== id);
    setSavedSelections(updatedSelections);
    localStorage.setItem("mvv.savedSelections", JSON.stringify(updatedSelections));
  };

  const renderSavedSelections = (selections) =>
    selections?.map(({
      id,
      stop: { name },
      lines
    }) => (
      <div key={id}>
        <Badge>
          {name}
          <Button
            variant="secondary"
            size="icon-xs"
            className="rounded-full"
            onClick={() => removeSavedSelection(id)}
          >
            <XIcon />
          </Button>
        </Badge>
      </div>
  ));

  const handleSearchStops = async (query: string) => {
    if (query.length < 4) return;
    const res = await mvvApi.searchStops(query);
    return res.results;
  };

  const handleStopSelect = async (item, value) => {
    setSelectedStop(item);

    const res = await mvvApi.getAvailableLines(item.id);
    setAvailableLines(res.lines);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = (availableLines || []).map((line) => line.stateless);
      setSelectedLines(ids);
      return;
    }

    setSelectedLines([]);
  };

  const handleLineClick = (lineId: string, checked: boolean) => {
    setSelectedLines((prev) => {
      if (checked) {
        if (prev.includes(lineId)) return prev;
        return [...prev, lineId];
      }

      return prev.filter((id) => id !== lineId);
    });
  };

  const renderAvailableLines = (lines) =>
    lines?.map(({ stateless, number, direction }) => (
      <div key={stateless} className="flex items-center gap-2">
        <Checkbox
          id={stateless}
          checked={selectedLines.includes(stateless)}
          onCheckedChange={(checked) => handleLineClick(stateless, !!checked)}
        />
        <Label htmlFor={stateless}>
          [{number}] {direction}
        </Label>
      </div>
    ));

  const handleGetDepartures = async (e) => {
    const res = await mvvApi.getDeparturesWithDelays(
      selectedStop.id,
      selectedLines,
    );

    setDepartures(res);
  };

  const renderDepartures = (departures) =>
    departures?.map(
      ({ departureLive, departurePlanned, line: { number, direction } }) => (
        <div
          key={`${number}-${direction}-${departurePlanned}`}
          className="flex gap-5"
        >
          <span>
            [{number}] {direction}
          </span>
          <span>
            <time dateTime={departurePlanned}>{departurePlanned}</time>
            {departureLive && (
              <>
                &nbsp;/&nbsp;
                <time
                  dateTime={departureLive}
                  className={
                    departureLive === departurePlanned
                      ? "text-green-600"
                      : "text-red-500"
                  }
                >
                  {departureLive}
                </time>
              </>
            )}
          </span>
        </div>
      ),
    );

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
        ? existing.findIndex(stop => stop.id === selectedStop.id)
        : -1;

      const isSameLines = (linesA, linesB) => {
        if (linesA === "all" && linesB === "all") return true;
        if (Array.isArray(linesA) && Array.isArray(linesB)) {
          if (linesA.length !== linesB.length) return false;
          const setA = new Set(linesA);
          return linesB.every(line => setA.has(line));
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
        localStorage.setItem("mvv.savedSelections", JSON.stringify(updatedSelections));
        setSavedSelections(updatedSelections);
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
      localStorage.setItem("mvv.savedSelections", JSON.stringify(updatedSelections));
      setSavedSelections(updatedSelections);
    } catch (err) {
      console.error("Failed to save selection", err);
    }
  };

  return (
    <div className="min-h-screen">
      <div>
        {renderSavedSelections(savedSelections)}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button onClick={handleGetDepartures}>Get Departures</Button>
        <Button
          type="button"
          onClick={saveSelection}
          disabled={!(selectedStop?.id && selectedLines.length)}
        >
          Save Selection
        </Button>
        <div className="text-sm text-muted">
          Saved: {savedSelections.length}
        </div>
      </div>
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
      </div>
      <div className="flex">
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
        <div>
          <h3>Status</h3>
          {renderDepartures(departures)}
        </div>
      </div>
    </div>
  );
}
