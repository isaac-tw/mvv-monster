import {
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Dispatch, SetStateAction } from "react";

import { getOrderedDepartureGroups } from "@/lib/departure-groups";
import type { Departure } from "@/services/mvv-service";
import type { SavedSelection } from "@/types/storage";

type UseDepartureBoardDndOptions = {
  departuresByStation: Departure[][];
  savedSelections: SavedSelection[];
  setDeparturesByStation: Dispatch<SetStateAction<Departure[][]>>;
  setSavedSelections: (selections: SavedSelection[]) => void;
};

export function useDepartureBoardDnd({
  departuresByStation,
  savedSelections,
  setDeparturesByStation,
  setSavedSelections,
}: UseDepartureBoardDndOptions) {
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
      ) {
        return;
      }

      const stationIndex = savedSelections.findIndex(
        (selection) => selection.id === stationId,
      );
      if (stationIndex < 0) return;

      const departures = departuresByStation[stationIndex] ?? [];
      const orderedGroups = getOrderedDepartureGroups(
        departures,
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

  return {
    handleDragEnd,
    sensors,
  };
}
