import { getLineIdFromStateless } from "@/lib/utils";
import type { Departure } from "@/services/mvv-service";

export type DepartureGroup = {
  id: string;
  departures: Departure[];
};

export function groupDeparturesByLine(
  departures: Departure[],
): DepartureGroup[] {
  const lineMap = new Map<string, DepartureGroup>();

  for (const departure of departures) {
    const lineId = getLineIdFromStateless(departure.line.stateless);

    if (!lineMap.has(lineId)) {
      lineMap.set(lineId, {
        id: lineId,
        departures: [],
      });
    }

    lineMap.get(lineId)?.departures.push(departure);
  }

  return Array.from(lineMap.values());
}

export function sortDepartureGroups(
  groups: DepartureGroup[],
  lineOrder?: string[],
): DepartureGroup[] {
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
}

export function getOrderedDepartureGroups(
  departures: Departure[],
  lineOrder?: string[],
): DepartureGroup[] {
  return sortDepartureGroups(groupDeparturesByLine(departures), lineOrder);
}
