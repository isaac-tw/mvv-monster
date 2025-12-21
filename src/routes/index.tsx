import { createFileRoute } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { SearchDialog } from "@/components/dialog/SearchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { type Departure, mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";

interface SavedSelection {
  id: string;
  stop: { id: string; name: string };
  lines: string | string[];
  savedAt: string;
}

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { openDialog } = useDialogStore();
  const [savedSelections, setSavedSelections] = useLocalStorage<SavedSelection[]>(
    "mvv.savedSelections",
    []
  );

  const [departuresByStation, setDeparturesByStation] = useState<Departure[][]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!savedSelections.length) return;

    let cancelled = false;
    const fetchDepartures = async () => {
      try {
        const results = await Promise.all(savedSelections.map(({ id, lines }) => mvvApi.getDeparturesWithDelays(id, lines)));
        if (!cancelled) {
          setDeparturesByStation(results);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.warn("Failed to fetch departures", err);
      }
    };

    fetchDepartures();
    const intervalId = setInterval(fetchDepartures, 30 * 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [savedSelections]);

  const removeSavedSelection = (id: string): void => {
    const updatedSelections = savedSelections.filter((selection) => selection.id !== id);
    setSavedSelections(updatedSelections);
    localStorage.setItem("mvv.savedSelections", JSON.stringify(updatedSelections));
  };

  const renderSavedSelections = (selections: SavedSelection[]): ReactNode =>
    selections?.map(({ id, stop: { name } }) => (
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

  const groupDeparturesByLine = (departures: Departure[]): Array<{ id: string; departures: Departure[] }> => {
    const lineMap = new Map<string, { id: string; departures: Departure[] }>();

    for (const departure of departures) {
      const lineId = departure.line.stateless;

      if (!lineMap.has(lineId)) {
        lineMap.set(lineId, {
          id: lineId,
          departures: [],
        });
      }
      const lineGroup = lineMap.get(lineId);
      if (lineGroup) lineGroup.departures.push(departure);
    }
    return Array.from(lineMap.values());
  };

  const renderDepartureGroups = ({ id, departures }: { id: string; departures: Departure[] }): ReactNode => (
    <div key={id}>
      <p className="text-gray-500 font-semibold">
        [{departures?.[0].line.number}] {departures?.[0].line.direction}
      </p>
      {departures.map(
        ({ departureLive, departurePlanned, line: { number, direction } }) => (
          <div
            key={`${number}-${direction}-${departurePlanned}`}
            className="flex gap-5"
          >
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
      )}
    </div>
  );

  const renderDeparturesByStation = (departuresByStation: Departure[][]): ReactNode =>
    departuresByStation.map((departures) => (
      <div key={departures?.[0]?.station.id}>
        <b>{departures?.[0]?.station.name}</b>
        <div className="flex flex-col gap-2">
          {groupDeparturesByLine(departures.slice(0, 10)).map(
            (departureGroups) => renderDepartureGroups(departureGroups),
          )}
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen">
      <div>{renderSavedSelections(savedSelections)}</div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          onClick={() => {
            openDialog(<SearchDialog />, "Add New Route");
          }}
        >
          ADD
        </Button>
        <div className="text-sm text-muted">
          Saved: {savedSelections.length}
        </div>
      </div>
      <div>
        <h3>Status</h3>
        {lastUpdated && (<div>Last updated: {lastUpdated.toLocaleString()}</div>)}
        <hr />
        <div className="flex flex-col gap-4">
          {renderDeparturesByStation(departuresByStation)}
        </div>
      </div>
    </div>
  );
}
