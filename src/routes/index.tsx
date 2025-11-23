import { createFileRoute } from "@tanstack/react-router";
import { Autocomplete } from "@/components/Autocomplete";
import { mvvApi } from "@/services/mvv-service";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const handleSearchStops = async (query: string) => {
    if (query.length < 4) return;
    const res = await mvvApi.searchStops(query);
    return res.results;
  };

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
        />
      </div>
    </div>
  );
}
