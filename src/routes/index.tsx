import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Autocomplete } from "@/components/Autocomplete";
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

  const selectAllId = useId();

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

  return (
    <div className="min-h-screen">
      <Button onClick={handleGetDepartures}>Get Departures</Button>
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
