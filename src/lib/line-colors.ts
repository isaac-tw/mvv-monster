// ============================================
// MVV Official Color Scheme
// ============================================

export const MVV_LINE_COLORS = {
  // S-Bahn Lines (each has unique color)
  S1: { background: "#1FBCE6", text: "#FFFFFF", border: "" }, // Turquoise
  S2: { background: "#79B833", text: "#FFFFFF", border: "" }, // Light Green
  S3: { background: "#962A85", text: "#FFFFFF", border: "" }, // Purple
  S4: { background: "#E41F28", text: "#FFFFFF", border: "" }, // Red
  S5: { background: "#00527F", text: "#FFFFFF", border: "" }, // Dark Blue
  S6: { background: "#008F5C", text: "#FFFFFF", border: "" }, // Green
  S7: { background: "#8A372F", text: "#FFFFFF", border: "" }, // Brown
  S8: { background: "#2D2B29", text: "#FFCD01", border: "" }, // Black with Yellow text
  S20: { background: "#EA5770", text: "#FFFFFF", border: "" }, // Pink

  // U-Bahn Lines (each has unique color)
  U1: { background: "#438136", text: "#FFFFFF", border: "" }, // Dark Green
  U2: { background: "#C40C37", text: "#FFFFFF", border: "" }, // Red
  U3: { background: "#F36E31", text: "#FFFFFF", border: "" }, // Orange
  U4: { background: "#0AB38D", text: "#FFFFFF", border: "" }, // Turquoise
  U5: { background: "#B8740E", text: "#FFFFFF", border: "" }, // Brown
  U6: { background: "#006CB3", text: "#FFFFFF", border: "" }, // Dark Blue
  U7: { background: "#438136", text: "#FFFFFF", border: "" }, // Green/Red: #438136/#C40C37
  U8: { background: "#C40C37", text: "#FFFFFF", border: "" }, // Red/Orange

  // Tram Lines (numbered, each has unique color)
  "12": { background: "#96368B", text: "#FFFFFF", border: "" },
  "16": { background: "#0065AE", text: "#FFFFFF", border: "" },
  "17": { background: "#8B563E", text: "#FFFFFF", border: "" },
  "18": { background: "#13A538", text: "#FFFFFF", border: "" },
  "19": { background: "#E30613", text: "#FFFFFF", border: "" },
  "20": { background: "#16BAE7", text: "#FFFFFF", border: "" },
  "21": { background: "#B28D33", text: "#FFFFFF", border: "" }, // not official
  "23": { background: "#BCCF00", text: "#FFFFFF", border: "" },
  "25": { background: "#F1919C", text: "#FFFFFF", border: "" },
  "27": { background: "#F7A600", text: "#FFFFFF", border: "" },
  "28": { background: "#FFFFFF", text: "#F7A600", border: "#F7A600" },

  // Regional trains
  RE1: { background: "#E50000", text: "#FFFFFF", border: "#7C7C7C" },
  RE5: { background: "#004080", text: "#FFFFFF", border: "#7C7C7C" },
  RB16: { background: "#FF9999", text: "#FFFFFF", border: "#999999" },
  RB54: { background: "#00ACE5", text: "#FFFFFF", border: "#999999" },

  // ExpressBus
  HEX: { background: "#646464", text: "#FFFFFF", border: "" },

  // Default
  default: { background: "#FFFFFF", text: "#444444", border: "" },
} as const;

// Category colors (fallback when specific line not found)
export const MVV_CATEGORY_COLORS = {
  "S-Bahn": { background: "#4C9046", text: "#FFFFFF", border: "" },
  "U-Bahn": { background: "#0066AE", text: "#FFFFFF", border: "" },
  Tram: { background: "#E30613", text: "#FFFFFF", border: "" },
  NachtTram: { background: "#1D1D1B", text: "#FBBA00", border: "" },
  MetroBus: { background: "#EC6726", text: "#FFFFFF", border: "" },
  Bus: { background: "#005262", text: "#FFFFFF", border: "" },
  ExpressBus: { background: "#244A9A", text: "#FFFFFF", border: "" },
  NachtBus: { background: "#1D1D1B", text: "#FBBA00", border: "" },
  Regionalzug: { background: "#36397f", text: "#FFFFFF", border: "" },
  FLEXlinie: { background: "#005262", text: "#FFFFFF", border: "" },
  SEV: { background: "#4C9046", text: "#FFFFFF", border: "" },
  default: { background: "#FFFFFF", text: "#444444", border: "" }, // Stadtbus, Ersatzverkehr
} as const;

// ============================================
// Type Definitions
// ============================================

export type TransitMode =
  | "S-Bahn"
  | "U-Bahn"
  | "Tram"
  | "NachtTram"
  | "MetroBus"
  | "Bus"
  | "ExpressBus"
  | "NachtBus"
  | "FLEXlinie"
  | "SEV"
  | "Regionalzug";

export interface LineColorScheme {
  background: string;
  text: string;
  border: string;
}

export interface LineInfo {
  number: string;
  symbol: string;
  direction: string;
  stateless: string;
  name: TransitMode;
}

// ============================================
// Utilities
// ============================================

/**
 * Normalize line number (remove spaces, slashes for combined lines)
 * S6/8 -> S6, S8/6 -> S8
 */
function normalizeLineNumber(lineNumber: string): string {
  const cleaned = lineNumber.trim().toUpperCase();

  // For combined lines like S6/8, S8/6, use the first number
  if (cleaned.includes("/")) return cleaned.split("/")[0];

  return cleaned;
}

/**
 * Get color scheme for a line
 * Prioritizes specific line colors, falls back to category colors
 */
export function getLineColors(line: LineInfo): LineColorScheme {
  // If LineInfo object
  if (typeof line === "object" && "number" in line) {
    const normalized = normalizeLineNumber(line.number);

    // Try to find specific line color
    if (normalized in MVV_LINE_COLORS) {
      return MVV_LINE_COLORS[normalized as keyof typeof MVV_LINE_COLORS];
    }

    // Fall back to category color
    if (line.name in MVV_CATEGORY_COLORS) {
      return MVV_CATEGORY_COLORS[line.name];
    }

    return MVV_CATEGORY_COLORS.default;
  }

  return MVV_CATEGORY_COLORS.default;
}
