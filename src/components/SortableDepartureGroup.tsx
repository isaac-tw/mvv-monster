import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

type SortableDepartureGroupProps = {
  children: ReactNode;
  isSortingEnabled: boolean;
  lineId: string;
  lineNumber: string;
  stationId: string;
};

export function SortableDepartureGroup({
  children,
  isSortingEnabled,
  lineId,
  lineNumber,
  stationId,
}: SortableDepartureGroupProps) {
  const sortableId = `line:${stationId}:${lineId}`;
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
      lineId,
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
          aria-label={`Reorder line ${lineNumber}`}
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
