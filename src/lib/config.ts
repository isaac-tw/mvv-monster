import type { LocationResult } from "@/services/mvv-service";
import type { SavedSelection } from "@/types/storage";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function isStop(value: unknown): value is LocationResult {
  if (!isRecord(value) || !isRecord(value.ref)) return false;
  const ref = value.ref;
  return (
    [
      "id",
      "name",
      "usage",
      "type",
      "stateless",
      "sort",
      "quality",
      "object",
      "mainLoc",
    ].every((key) => typeof value[key] === "string") &&
    ["id", "gid", "omc", "placeID", "place", "coords"].every(
      (key) => typeof ref[key] === "string",
    ) &&
    ["stop", "street", "poi"].includes(String(value.anyType)) &&
    (value.best === "0" || value.best === "1") &&
    ["modes", "postcode", "street"].every(
      (key) => value[key] === undefined || typeof value[key] === "string",
    ) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
}

export function exportConfig(savedSelections: SavedSelection[]): string {
  return JSON.stringify(
    { format: "mvv-monster", version: 1, savedSelections },
    null,
    2,
  );
}

export function importConfig(text: string): SavedSelection[] {
  let config: unknown;
  try {
    config = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid JSON configuration file.");
  }
  if (
    !isRecord(config) ||
    config.format !== "mvv-monster" ||
    config.version !== 1
  ) {
    throw new Error("This file is not a supported MVV Monster configuration.");
  }
  if (
    !Array.isArray(config.savedSelections) ||
    config.savedSelections.length > 3
  ) {
    throw new Error("A configuration must contain up to 3 saved stops.");
  }
  const ids = new Set<string>();
  return config.savedSelections.map((selection: unknown): SavedSelection => {
    if (
      !isRecord(selection) ||
      !isStop(selection.stop) ||
      selection.id !== selection.stop.id ||
      ids.has(selection.stop.id) ||
      !(
        selection.lines === "all" ||
        (isStringList(selection.lines) && selection.lines.length > 0)
      ) ||
      !(
        selection.lineOrder === undefined || isStringList(selection.lineOrder)
      ) ||
      typeof selection.savedAt !== "string" ||
      !Number.isFinite(Date.parse(selection.savedAt))
    ) {
      throw new Error(
        "The configuration contains an invalid or duplicate saved stop.",
      );
    }
    ids.add(selection.stop.id);
    return {
      id: selection.stop.id,
      stop: selection.stop,
      lines: selection.lines,
      ...(selection.lineOrder === undefined
        ? {}
        : { lineOrder: selection.lineOrder }),
      savedAt: selection.savedAt,
    };
  });
}
