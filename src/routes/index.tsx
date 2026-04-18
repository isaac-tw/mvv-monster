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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, GripVertical, Plus, RefreshCw, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { RemoveSavedSelectionDialog } from "@/components/dialog/RemoveSavedSelectionDialog";
import { SearchDialog } from "@/components/dialog/SearchDialog";
import { SortableStationCard } from "@/components/SortableStationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLineColors } from "@/lib/line-colors";
import { calculateDelay, getLineIdFromStateless } from "@/lib/utils";
import { type Departure, mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SavedSelection } from "@/types/storage";

export const Route = createFileRoute("/")({ component: App });

type DepartureGroup = {
  id: string;
  departures: Departure[];
};

type SortableDepartureGroupProps = {
  group: DepartureGroup;
  stationId: string;
  children: ReactNode;
  isSortingEnabled: boolean;
};

function SortableDepartureGroup({
  group,
  stationId,
  children,
  isSortingEnabled,
}: SortableDepartureGroupProps) {
  const sortableId = `line:${stationId}:${group.id}`;
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: {
      type: "line-group",
      stationId,
      lineId: group.id,
    },
    disabled: !isSortingEnabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? "opacity-70" : ""}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md cursor-grab touch-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-default disabled:opacity-40 active:cursor-grabbing"
          disabled={!isSortingEnabled}
          aria-label={`Reorder line ${group.departures?.[0]?.line.number}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function App() {
  const { openDialog } = useDialogStore();
  const { savedSelections, setSavedSelections, isLoading } =
    useSavedSelectionsStore();

  const [departuresByStation, setDeparturesByStation] = useState<Departure[][]>(
    [],
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const departuresFetchSnapshot = savedSelections.map(({ id, lines }) => ({
    id,
    lines,
  }));
  const departuresFetchKey = JSON.stringify(departuresFetchSnapshot);

  useEffect(() => {
    const departuresFetchSelections = JSON.parse(departuresFetchKey) as Array<{
      id: string;
      lines: SavedSelection["lines"];
    }>;

    if (!departuresFetchSelections.length) return;

    let cancelled = false;
    const fetchDepartures = async () => {
      try {
        const results = await Promise.all(
          departuresFetchSelections.map(({ id, lines }) =>
            mvvApi.getDeparturesWithDelays(id, lines),
          ),
        );
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
  }, [departuresFetchKey]);

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
    const updatedSelections = savedSelections.filter(
      (selection) => selection.id !== id,
    );
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

  const groupDeparturesByLine = (departures: Departure[]): DepartureGroup[] => {
    const lineMap = new Map<string, DepartureGroup>();

    for (const departure of departures) {
      const lineId = getLineIdFromStateless(departure.line.stateless);

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

  const sortDepartureGroups = (
    groups: DepartureGroup[],
    lineOrder?: string[],
  ): DepartureGroup[] => {
    const baseSortedGroups = [...groups].sort((groupA, groupB) => {
      const firstDepartureA = groupA.departures[0];
      const firstDepartureB = groupB.departures[0];

      const lineNumberComparison = firstDepartureA.line.number.localeCompare(
        firstDepartureB.line.number,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      );

      if (lineNumberComparison !== 0) return lineNumberComparison;

      return firstDepartureA.line.direction.localeCompare(
        firstDepartureB.line.direction,
        undefined,
        {
          sensitivity: "base",
        },
      );
    });

    if (!lineOrder?.length) return baseSortedGroups;

    const lineOrderIndex = new Map(
      lineOrder.map((lineId, index) => [lineId, index]),
    );

    return baseSortedGroups.sort((groupA, groupB) => {
      const indexA = lineOrderIndex.get(groupA.id);
      const indexB = lineOrderIndex.get(groupB.id);

      if (indexA === undefined && indexB === undefined) return 0;
      if (indexA === undefined) return 1;
      if (indexB === undefined) return -1;
      return indexA - indexB;
    });
  };

  const renderDepartures = ({
    departureLive,
    departurePlanned,
    line: { number, direction },
  }: Departure) => {
    if (departureLive === "Halt entfällt") {
      return (
        <div
          key={`${number}-${direction}-${departurePlanned}`}
          className="flex items-center gap-3 font-mono text-sm"
        >
          <span className="line-through text-gray-400">{departurePlanned}</span>
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
            {departureLive}
          </span>
        </div>
      );
    }

    const delay = departureLive
      ? calculateDelay(departurePlanned, departureLive)
      : null;
    return (
      <div
        key={`${number}-${direction}-${departurePlanned}`}
        className="flex items-center gap-3 font-mono text-sm"
      >
        {delay === null ? (
          <span className="text-green-700 font-semibold flex items-center gap-2">
            {departurePlanned || "-"}
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              TBD
            </span>
          </span>
        ) : delay > 0 ? (
          <>
            <span className="line-through text-gray-400">
              {departurePlanned}
            </span>
            <span className="text-red-600 font-semibold">{departureLive}</span>
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
              +{delay} min
            </span>
          </>
        ) : (
          <span className="text-green-700 font-semibold flex items-center gap-2">
            {departureLive}
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
              On time
            </span>
          </span>
        )}
      </div>
    );
  };

  const renderDepartureGroups = ({
    id,
    departures,
  }: DepartureGroup): ReactNode => (
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
        {departures.values().map(renderDepartures).take(5).toArray()}
      </div>
    </div>
  );

  const renderDeparturesByStation = (selections: SavedSelection[]): ReactNode =>
    selections.map((selection, index) => {
      const departures = departuresByStation[index] ?? [];
      const departureGroups = sortDepartureGroups(
        groupDeparturesByLine(departures),
        selection.lineOrder,
      );

      return (
        <SortableStationCard
          key={selection.id}
          sortableId={`station:${selection.id}`}
          selection={selection}
          stationName={departures?.[0]?.station.name ?? selection.stop.name}
          isSortingEnabled={selections.length > 1}
        >
          {departures.length > 0 ? (
            <SortableContext
              items={departureGroups.map(
                (group) => `line:${selection.id}:${group.id}`,
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {departureGroups.map((group) => (
                  <SortableDepartureGroup
                    key={group.id}
                    group={group}
                    stationId={selection.id}
                    isSortingEnabled={departureGroups.length > 1}
                  >
                    {renderDepartureGroups(group)}
                  </SortableDepartureGroup>
                ))}
              </div>
            </SortableContext>
          ) : (
            <p className="text-sm text-gray-500">Loading departures...</p>
          )}
        </SortableStationCard>
      );
    });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const activeType = activeData?.type;

    if (activeType === "line-group") {
      if (!activeData) return;

      const stationId = activeData.stationId as string | undefined;
      const activeLineId = activeData.lineId as string | undefined;
      const overData = over.data.current;
      const overStationId = overData?.stationId as string | undefined;
      const overLineId = overData?.lineId as string | undefined;

      if (
        !stationId ||
        stationId !== overStationId ||
        !activeLineId ||
        !overLineId
      )
        return;

      const stationIndex = savedSelections.findIndex(
        (selection) => selection.id === stationId,
      );
      if (stationIndex < 0) return;

      const departures = departuresByStation[stationIndex] ?? [];
      const orderedGroups = sortDepartureGroups(
        groupDeparturesByLine(departures),
        savedSelections[stationIndex].lineOrder,
      );
      const oldIndex = orderedGroups.findIndex(
        (group) => group.id === activeLineId,
      );
      const newIndex = orderedGroups.findIndex(
        (group) => group.id === overLineId,
      );

      if (oldIndex < 0 || newIndex < 0) return;

      const nextLineOrder = arrayMove(orderedGroups, oldIndex, newIndex).map(
        (group) => group.id,
      );
      const nextSelections = [...savedSelections];
      nextSelections[stationIndex] = {
        ...nextSelections[stationIndex],
        lineOrder: nextLineOrder,
      };
      setSavedSelections(nextSelections);
      return;
    }

    const oldIndex = savedSelections.findIndex(
      (selection) => `station:${selection.id}` === active.id,
    );
    const newIndex = savedSelections.findIndex(
      (selection) => `station:${selection.id}` === over.id,
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
            <p className="text-sm text-gray-500 ml-3">
              Maximum of 3 saved stops reached
            </p>
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
          items={savedSelections.map((selection) => `station:${selection.id}`)}
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
