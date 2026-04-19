import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { DepartureGroupCard } from "@/components/DepartureGroupCard";
import { SortableDepartureGroup } from "@/components/SortableDepartureGroup";
import { SortableStationCard } from "@/components/SortableStationCard";
import { getOrderedDepartureGroups } from "@/lib/departure-groups";
import type { Departure } from "@/services/mvv-service";
import type { SavedSelection } from "@/types/storage";

type StationDeparturesListProps = {
  departuresByStation: Departure[][];
  savedSelections: SavedSelection[];
};

export function StationDeparturesList({
  departuresByStation,
  savedSelections,
}: StationDeparturesListProps) {
  return savedSelections.map((selection, index) => {
    const departures = departuresByStation[index] ?? [];
    const departureGroups = getOrderedDepartureGroups(
      departures,
      selection.lineOrder,
    );

    return (
      <SortableStationCard
        key={selection.id}
        sortableId={`station:${selection.id}`}
        selection={selection}
        stationName={departures[0]?.station.name ?? selection.stop.name}
        isSortingEnabled={savedSelections.length > 1}
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
                  lineId={group.id}
                  lineNumber={group.departures[0]?.line.number ?? group.id}
                  stationId={selection.id}
                  isSortingEnabled={departureGroups.length > 1}
                >
                  <DepartureGroupCard group={group} />
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
}
