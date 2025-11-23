import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Autocomplete } from "@/components/Autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { mvvApi } from "@/services/mvv-service";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const [selectedStop, setSelectedStop] = useState({});
  const [availableLines, setAvailableLines] = useState([]);

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

  const renderAvailableLines = (lines) =>
    lines?.map(({ stateless, number, direction }) => (
      <div key={stateless} className="flex items-center gap-2">
        <Checkbox id={stateless} />
        <Label htmlFor={stateless}>
          [{number}] {direction}
        </Label>
      </div>
    ));

  return (
    <div className="min-h-screen">
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
      <div className="flex flex-col gap-1">
        {renderAvailableLines(availableLines)}
      </div>
    </div>
  );
}
