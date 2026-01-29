import { createFileRoute } from "@tanstack/react-router";
import { Clock, Plus, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { SearchDialog } from "@/components/dialog/SearchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLineColors } from "@/lib/line-colors";
import { type Departure, mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SavedSelection } from "@/types/storage";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { openDialog } = useDialogStore();
  const { savedSelections, setSavedSelections } = useSavedSelectionsStore();

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
  };

  const renderSavedSelections = (selections: SavedSelection[]): ReactNode =>
    selections?.map(({ id, stop: { name } }) => (
      <div key={id}>
        <Badge className="flex gap-2 px-2 py-1">
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
      <div className="text-gray-500 font-semibold mb-2">
        <span
          className="text-sm font-bold px-2 py-1 rounded mr-1"
          style={{
            backgroundColor: getLineColors(departures?.[0].line).background,
            color: getLineColors(departures?.[0].line).text,
          }}
        >
          {departures?.[0].line.number}
        </span>
        <span className="font-medium text-gray-700">
          {departures?.[0].line.direction}
        </span>
      </div>
      {departures.slice(0, 5).map(
        ({ departureLive, departurePlanned, line: { number, direction } }) => (
          <div
            key={`${number}-${direction}-${departurePlanned}`}
            className="flex gap-5"
          >
            {departureLive && (
              <span>
                <time dateTime={departurePlanned}>{departurePlanned}</time>
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
              </span>
            )}
          </div>
        ),
      )}
    </div>
  );

  const renderDeparturesByStation = (departuresByStation: Departure[][]): ReactNode =>
    departuresByStation.map((departures) => (
      <div
        className="border-b border-gray-20 bg-white rounded-lg shadow"
        key={departures?.[0]?.station.id}
      >
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 px-6 py-4">
          {departures?.[0]?.station.name}
        </h2>
        <div className="flex flex-col gap-3 p-6">
          {groupDeparturesByLine(departures).map(
            (departureGroups) => renderDepartureGroups(departureGroups),
          )}
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900">Departures Today</h1>
      <div className="flex flex-wrap gap-2 my-4">
        {renderSavedSelections(savedSelections)}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2 mb-4">
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            openDialog(<SearchDialog />, "Add New Route");
          }}
        >
          <Plus /> ADD ROUTE
        </Button>
        {lastUpdated && (
          <div className="flex items-center gap-1 text-sm">
            <Clock size={16} />
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {renderDeparturesByStation(departuresByStation)}
      </div>
    </div>
  );
}
