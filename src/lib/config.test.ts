import { describe, expect, it } from "vitest";
import type { SavedSelection } from "../types/storage";
import { exportConfig, importConfig } from "./config";

const selection: SavedSelection = {
  id: "station-1",
  stop: {
    id: "station-1",
    name: "Marienplatz",
    usage: "",
    type: "",
    stateless: "station-1",
    anyType: "stop",
    sort: "",
    quality: "",
    best: "1",
    object: "",
    mainLoc: "",
    ref: { id: "", gid: "", omc: "", placeID: "", place: "", coords: "" },
  },
  lines: ["swm:1:H:001"],
  lineOrder: ["swm:1:H"],
  savedAt: "2026-11-08T12:00:00.000Z",
};

describe("portable configuration", () => {
  it("preserves station order, full line filters, normalized group order, and all-lines selections", () => {
    const selections: SavedSelection[] = [
      { ...selection, lines: "all" },
      {
        ...selection,
        id: "station-2",
        stop: { ...selection.stop, id: "station-2" },
      },
    ];
    expect(importConfig(exportConfig(selections))).toEqual(selections);
  });

  it("allows an empty configuration to intentionally clear saved stops", () => {
    expect(importConfig(exportConfig([]))).toEqual([]);
  });

  it.each([
    "{",
    "null",
    JSON.stringify({ format: "mvv-monster", version: 2, savedSelections: [] }),
  ])("rejects malformed or unsupported files: %s", (text) => {
    expect(() => importConfig(text)).toThrow();
  });

  it.each([
    [selection, selection],
    Array.from({ length: 4 }, (_, i) => ({
      ...selection,
      id: String(i),
      stop: { ...selection.stop, id: String(i) },
    })),
    [{ ...selection, lines: [] }],
    [{ ...selection, lines: [42] }],
    [{ ...selection, lineOrder: [null] }],
    [{ ...selection, savedAt: "invalid" }],
    [{ ...selection, id: "different-stop" }],
    [{ ...selection, stop: { id: selection.id, name: "Incomplete" } }],
  ])(
    "rejects invalid data before any saved configuration can be replaced (%#)",
    (...savedSelections) => {
      const text = JSON.stringify({
        format: "mvv-monster",
        version: 1,
        savedSelections,
      });
      expect(() => importConfig(text)).toThrow();
    },
  );
});
