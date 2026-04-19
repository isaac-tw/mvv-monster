import { closestCenter, DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Plus, RefreshCw } from "lucide-react";

import { RemoveSavedSelectionDialog } from "@/components/dialog/RemoveSavedSelectionDialog";
import { SearchDialog } from "@/components/dialog/SearchDialog";
import { SavedSelectionBadges } from "@/components/SavedSelectionBadges";
import { StationDeparturesList } from "@/components/StationDeparturesList";
import { Button } from "@/components/ui/button";
import { useDepartureBoardDnd } from "@/hooks/useDepartureBoardDnd";
import { useDeparturePolling } from "@/hooks/useDeparturePolling";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import type { SavedSelection } from "@/types/storage";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { openDialog } = useDialogStore();
  const { savedSelections, setSavedSelections, isLoading } =
    useSavedSelectionsStore();
  const { departuresByStation, lastUpdated, setDeparturesByStation } =
    useDeparturePolling(savedSelections);
  const { handleDragEnd, sensors } = useDepartureBoardDnd({
    departuresByStation,
    savedSelections,
    setDeparturesByStation,
    setSavedSelections,
  });

  const removeSavedSelection = (id: string) => {
    const updatedSelections = savedSelections.filter(
      (selection) => selection.id !== id,
    );
    setSavedSelections(updatedSelections);
  };

  const confirmRemoveSavedSelection = (selection: SavedSelection) => {
    openDialog(
      <RemoveSavedSelectionDialog
        stopName={selection.stop.name}
        onConfirm={() => removeSavedSelection(selection.id)}
      />,
      "Remove Route",
    );
  };

  const editSavedSelection = (selection: SavedSelection) => {
    openDialog(<SearchDialog initialSelection={selection} />, "Edit Route");
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900">Departures Today</h1>
      <div className="flex flex-wrap gap-2 my-4">
        <SavedSelectionBadges
          selections={savedSelections}
          onEdit={editSavedSelection}
          onRemove={confirmRemoveSavedSelection}
        />
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
            <StationDeparturesList
              departuresByStation={departuresByStation}
              savedSelections={savedSelections}
            />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
