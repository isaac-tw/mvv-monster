import { useEffect, useState } from "react";

import { type Departure, mvvApi } from "@/services/mvv-service";
import type { SavedSelection } from "@/types/storage";

const REFRESH_INTERVAL_MS = 30_000;

type FetchSelection = Pick<SavedSelection, "id" | "lines">;

export function useDeparturePolling(savedSelections: SavedSelection[]) {
  const [departuresByStation, setDeparturesByStation] = useState<Departure[][]>(
    [],
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const departuresFetchSelections: FetchSelection[] = savedSelections.map(
      ({ id, lines }) => ({
        id,
        lines,
      }),
    );
    let cancelled = false;

    if (departuresFetchSelections.length === 0) {
      setDeparturesByStation([]);
      setLastUpdated(null);
      return;
    }

    const refreshDepartures = async () => {
      const results = await Promise.all(
        departuresFetchSelections.map(({ id, lines }) =>
          mvvApi.getDeparturesWithDelays(id, lines),
        ),
      );

      if (cancelled) return;

      setDeparturesByStation(results);
      setLastUpdated(new Date());
    };

    const refreshDeparturesSafely = () => {
      refreshDepartures().catch((error) => {
        if (!cancelled) {
          console.warn("Failed to fetch departures", error);
        }
      });
    };

    refreshDeparturesSafely();
    const intervalId = window.setInterval(
      refreshDeparturesSafely,
      REFRESH_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [savedSelections]);

  return {
    departuresByStation,
    lastUpdated,
    setDeparturesByStation,
  };
}
