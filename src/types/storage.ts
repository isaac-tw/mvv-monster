import type { LocationResult } from "@/services/mvv-service";

export type SaveLines = "all" | string[];

export interface SavedSelection {
  id: string;
  stop: LocationResult;
  lines: SaveLines;
  savedAt: string;
}
