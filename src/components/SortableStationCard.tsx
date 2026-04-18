import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

import type { SavedSelection } from "@/types/storage";

type SortableStationCardProps = {
  children: ReactNode;
  stationName: string;
  isSortingEnabled: boolean;
  selection: SavedSelection;
  sortableId: string;
};

export function SortableStationCard({
  children,
  stationName,
  isSortingEnabled,
  selection,
  sortableId,
}: SortableStationCardProps) {
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
      type: "station",
      stationId: selection.id,
    },
    disabled: !isSortingEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-20 bg-white rounded-lg shadow ${
        isDragging ? "opacity-70 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-bold text-gray-900">{stationName}</h2>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md cursor-grab touch-none text-gray-500 transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:opacity-50 active:cursor-grabbing"
          disabled={!isSortingEnabled}
          aria-label={`Reorder ${selection.stop.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </button>
      </div>
      <div className="flex flex-col gap-3 p-6">{children}</div>
    </div>
  );
}
