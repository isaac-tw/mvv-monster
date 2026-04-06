import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Plus, RefreshCw, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { RemoveSavedSelectionDialog } from "@/components/dialog/RemoveSavedSelectionDialog";
import { SearchDialog } from "@/components/dialog/SearchDialog";
import { SortableStationCard } from "@/components/SortableStationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLineColors } from "@/lib/line-colors";
import { calculateDelay } from "@/lib/utils";
import { type Departure, mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SavedSelection } from "@/types/storage";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { openDialog } = useDialogStore();
  const { savedSelections, setSavedSelections, isLoading } = useSavedSelectionsStore();

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const removeSavedSelection = (id: string): void => {
    const updatedSelections = savedSelections.filter((selection) => selection.id !== id);
    setSavedSelections(updatedSelections);
  };

  const confirmRemoveSavedSelection = (selection: SavedSelection): void => {
    openDialog(
      <RemoveSavedSelectionDialog
        stopName={selection.stop.name}
        onConfirm={() => removeSavedSelection(selection.id)}
      />,
      "Remove Route",
    );
  };

  const editSavedSelection = (selection: SavedSelection): void => {
    openDialog(<SearchDialog initialSelection={selection} />, "Edit Route");
  };

  const renderSavedSelections = (selections: SavedSelection[]): ReactNode => 
    selections?.map((selection) => (
      <div key={selection.id}>
        <Badge
          className="flex cursor-pointer gap-2 px-2 py-1"
          onClick={() => editSavedSelection(selection)}
        >
          {selection.stop.name}
          <Button
            variant="secondary"
            size="icon-xs"
            className="rounded-full"
            onClick={(event) => {
              event.stopPropagation();
              confirmRemoveSavedSelection(selection);
            }}
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

  const renderDepartures = ({ departureLive, departurePlanned, line: { number, direction } }: Departure) => {
    if (departureLive === "Halt entfällt") {
      return (
        <div key={`${number}-${direction}-${departurePlanned}`} className="flex items-center gap-3 font-mono text-sm">
          <span className="line-through text-gray-400">{departurePlanned}</span>
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{departureLive}</span>
        </div>
      );
    }

    const delay = departureLive ? calculateDelay(departurePlanned, departureLive) : null;
    return (
      <div key={`${number}-${direction}-${departurePlanned}`} className="flex items-center gap-3 font-mono text-sm">
        {delay === null
          ? (
              <span className="text-green-700 font-semibold flex items-center gap-2">
                {departurePlanned || "-"}
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">TBD</span>
              </span>
          ) : delay > 0
            ? (
              <>
                <span className="line-through text-gray-400">{departurePlanned}</span>
                <span className="text-red-600 font-semibold">{departureLive}</span>
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">+{delay} min</span>
              </>
            ) : (
              <span className="text-green-700 font-semibold flex items-center gap-2">
                {departureLive}
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">On time</span>
              </span>
            )
          }
      </div>
    );
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
      <div className="flex flex-col gap-1 ml-0.5">
        {departures
          .values()
          .map(renderDepartures)
          .take(5)
          .toArray()
        }
      </div>
    </div>
  );

  const renderDeparturesByStation = (selections: SavedSelection[]): ReactNode =>
    selections.map((selection, index) => {
      const departures = departuresByStation[index] ?? [];

      return (
        <SortableStationCard
          key={selection.id}
          selection={selection}
          stationName={departures?.[0]?.station.name ?? selection.stop.name}
          isSortingEnabled={selections.length > 1}
        >
          {departures.length > 0 ? (
            groupDeparturesByLine(departures).map((departureGroups) =>
              renderDepartureGroups(departureGroups),
            )
          ) : (
            <p className="text-sm text-gray-500">Loading departures...</p>
          )}
        </SortableStationCard>
      );
    });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = savedSelections.findIndex(
      (selection) => selection.id === active.id,
    );
    const newIndex = savedSelections.findIndex(
      (selection) => selection.id === over.id,
    );

    if (oldIndex < 0 || newIndex < 0) return;

    setSavedSelections(arrayMove(savedSelections, oldIndex, newIndex));
    setDeparturesByStation((current) =>
      oldIndex < current.length && newIndex < current.length
        ? arrayMove(current, oldIndex, newIndex)
        : current,
    );
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900">Departures Today</h1>
      <div className="flex flex-wrap gap-2 my-4">
        {renderSavedSelections(savedSelections)}
      </div>
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-2 mt-2 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-1">
          <Button
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            disabled={isLoading || savedSelections.length >= 3}
            onClick={() => {
              openDialog(<SearchDialog />, "Add New Route");
            }}
          >
            <Plus /> ADD ROUTE
          </Button>
          {!isLoading && savedSelections.length === 0 && (
            <p className="text-sm text-gray-500 ml-3">Add a route to start</p>
          )}
          {savedSelections.length >= 3 && (
            <p className="text-sm text-gray-500 ml-3">Maximum of 3 saved stops reached</p>
          )}
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1">
              <RefreshCw size={16} />
              Auto-refresh: 30s
            </div>
          </div>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={savedSelections.map((selection) => selection.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-4">
            {renderDeparturesByStation(savedSelections)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
