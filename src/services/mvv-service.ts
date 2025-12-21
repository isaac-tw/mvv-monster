// ============================================
// Types
// ============================================

export interface StopFinderResponse {
  success: boolean;
  message: string;
  results: LocationResult[];
}

export interface LocationResult {
  usage: string;
  type: string;
  name: string;
  stateless: string;
  anyType: 'stop' | 'street' | 'poi';
  sort: string;
  quality: string;
  best: '0' | '1';
  object: string;
  mainLoc: string;
  modes?: string;
  postcode?: string;
  street?: string;
  ref: LocationReference;
  id: string;
}

export interface LocationReference {
  id: string;
  gid: string;
  omc: string;
  placeID: string;
  place: string;
  coords: string;
}

export interface AvailableLinesResponse {
  error: string;
  lines: LineInfo[];
  icons: any[];
}

export interface LineInfo {
  number: string;
  symbol: string;
  direction: string;
  stateless: string;
  name: TransitMode;
}

export type TransitMode = 
  | 'Bus'
  | 'MetroBus'
  | 'NachtBus'
  | 'ExpressBus'
  | 'Tram'
  | 'NightTram'
  | 'U-Bahn'
  | 'S-Bahn';

export interface DeparturesResponse {
  error: string;
  departures: Departure[];
  notifications: Notification[];
}

export interface Departure {
  line: LineInfo;
  direction: string;
  station: {
    id: string;
    name: string;
  };
  track: string;
  departureDate: string;
  departurePlanned: string;
  departureLive: string;
  inTime: boolean;
  notifications: Notification[];
}

export interface Notification {
  text: string;
  link: string;
  type: string;
}

// ============================================
// Utilities
// ============================================

/**
 * Encode line identifiers for MVV API
 * Handles percent encoding and base64 encoding
 */
export function encodeLines(lineIds: 'all' | string[]): string {
  const queryString = lineIds === 'all'
    ? '&line=all'
    : lineIds.map(id => `&line=${encodeURIComponent(id)}`).join('');
  return btoa(queryString);
}

/**
 * Decode line identifiers (for debugging)
 */
export function decodeLines(encoded: string): string[] {
  try {
    const decoded = atob(encoded);
    const matches = decoded.match(/&line=([^&]+)/g) || [];
    return matches.map(match => 
      decodeURIComponent(match.replace('&line=', ''))
    );
  } catch (error) {
    console.error('Failed to decode lines:', error);
    return [];
  }
}

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get timestamp N minutes from now
 */
export function getTimestampInMinutes(minutes: number): number {
  return Math.floor((Date.now() + minutes * 60 * 1000) / 1000);
}

/**
 * Convert Date object to Unix timestamp
 */
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Parse coordinates from MVV format to lat/lng
 * Note: MVV uses projected coordinates (likely EPSG:31468 - Gauss-Krüger Zone 4)
 * This is a placeholder - actual conversion requires projection library
 */
export function parseCoordinates(coords: string): { x: number; y: number } {
  const [x, y] = coords.split(',').map(parseFloat);
  return { x, y };
}

/**
 * Calculate delay in minutes
 */
export function calculateDelay(planned: string, live: string): number {
  if (!live) return 0;
  
  const [plannedHour, plannedMin] = planned.split(':').map(Number);
  const [liveHour, liveMin] = live.split(':').map(Number);
  
  const plannedMinutes = plannedHour * 60 + plannedMin;
  const liveMinutes = liveHour * 60 + liveMin;
  
  return liveMinutes - plannedMinutes;
}

/**
 * Group lines by transit mode
 */
export function groupLinesByMode(lines: LineInfo[]): Record<TransitMode, LineInfo[]> {
  return lines.reduce((acc, line) => {
    if (!acc[line.name]) {
      acc[line.name] = [];
    }
    acc[line.name].push(line);
    return acc;
  }, {} as Record<TransitMode, LineInfo[]>);
}

/**
 * Extract line prefixes to determine transit mode
 */
export function getLinePrefixInfo(stateless: string): {
  operator: string;
  lineId: string;
  type: string;
  direction: 'H' | 'R';
  variant: string;
} {
  const parts = stateless.split(':');
  return {
    operator: parts[0],
    lineId: parts[1],
    type: parts[2],
    direction: parts[3] as 'H' | 'R',
    variant: parts[4]
  };
}

// ============================================
// API Service
// ============================================

export class MvvApiService {
  private readonly baseUrl = 'https://www.mvv-muenchen.de';

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check for API-level errors
      if ('error' in data && data.error) {
        throw new Error(`API error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('MVV API Error:', error);
      throw error;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(params: Record<string, string>): string {
    const searchParams = new URLSearchParams(params);
    return `${this.baseUrl}/?${searchParams.toString()}`;
  }

  // ==========================================
  // Stop Finder
  // ==========================================

  /**
   * Search for transit stops, stations, or street addresses
   */
  async searchStops(query: string): Promise<StopFinderResponse> {
    const url = this.buildUrl({
      eID: 'stopFinder',
      query,
    });

    return this.fetchWithErrorHandling<StopFinderResponse>(url);
  }

  /**
   * Get best matching stop (first result with best="1")
   */
  async getBestStop(query: string): Promise<LocationResult | null> {
    const response = await this.searchStops(query);
    return response.results.find(r => r.best === '1') || null;
  }

  /**
   * Get only transit stops (filter out streets)
   */
  async searchTransitStops(query: string): Promise<LocationResult[]> {
    const response = await this.searchStops(query);
    return response.results.filter(r => r.anyType === 'stop');
  }

  // ==========================================
  // Available Lines
  // ==========================================

  /**
   * Get all transit lines serving a specific stop
   */
  async getAvailableLines(stopId: string): Promise<AvailableLinesResponse> {
    const url = this.buildUrl({
      eID: 'departuresFinder',
      action: 'available_lines',
      stop_id: stopId,
    });

    return this.fetchWithErrorHandling<AvailableLinesResponse>(url);
  }

  /**
   * Get lines grouped by transit mode
   */
  async getAvailableLinesGrouped(
    stopId: string
  ): Promise<Record<TransitMode, LineInfo[]>> {
    const response = await this.getAvailableLines(stopId);
    return groupLinesByMode(response.lines);
  }

  /**
   * Get lines for specific transit modes
   */
  async getLinesByMode(
    stopId: string,
    modes: TransitMode[]
  ): Promise<LineInfo[]> {
    const response = await this.getAvailableLines(stopId);
    return response.lines.filter(line => modes.includes(line.name));
  }

  // ==========================================
  // Departures
  // ==========================================

  /**
   * Get departures for specific lines at a stop
   * @param stopId - Stop ID (e.g., "de:09162:1102")
   * @param lineIds - Array of stateless line IDs
   * @param timestamp - Unix timestamp in seconds (optional, defaults to now)
   */
  async getDepartures(
    stopId: string,
    lineIds: 'all' | string[],
    timestamp?: number
  ): Promise<DeparturesResponse> {
    const encodedLines = encodeLines(lineIds);
    const ts = timestamp || getCurrentTimestamp();

    const url = this.buildUrl({
      eID: 'departuresFinder',
      action: 'get_departures',
      stop_id: stopId,
      requested_timestamp: ts.toString(),
      lines: encodedLines,
    });

    return this.fetchWithErrorHandling<DeparturesResponse>(url);
  }

  /**
   * Get all departures at a stop (all available lines)
   */
  async getAllDepartures(
    stopId: string,
    timestamp?: number
  ): Promise<DeparturesResponse> {
    // First get all available lines
    const linesResponse = await this.getAvailableLines(stopId);
    const lineIds = linesResponse.lines.map(line => line.stateless);

    // Then get departures for all lines
    return this.getDepartures(stopId, lineIds, timestamp);
  }

  /**
   * Get departures for specific transit modes
   */
  async getDeparturesByMode(
    stopId: string,
    modes: TransitMode[],
    timestamp?: number
  ): Promise<DeparturesResponse> {
    const lines = await this.getLinesByMode(stopId, modes);
    const lineIds = lines.map(line => line.stateless);
    return this.getDepartures(stopId, lineIds, timestamp);
  }

  /**
   * Get departures starting N minutes from now
   */
  async getDeparturesIn(
    stopId: string,
    lineIds: 'all' | string[],
    minutes: number
  ): Promise<DeparturesResponse> {
    const timestamp = getTimestampInMinutes(minutes);
    return this.getDepartures(stopId, lineIds, timestamp);
  }

  /**
   * Get departures at a specific time
   */
  async getDeparturesAt(
    stopId: string,
    lineIds: 'all' | string[],
    date: Date
  ): Promise<DeparturesResponse> {
    const timestamp = dateToTimestamp(date);
    return this.getDepartures(stopId, lineIds, timestamp);
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Get only delayed departures
   */
  async getDelayedDepartures(
    stopId: string,
    lineIds: 'all' | string[],
    timestamp?: number
  ): Promise<Departure[]> {
    const response = await this.getDepartures(stopId, lineIds, timestamp);
    return response.departures.filter(d => !d.inTime);
  }

  /**
   * Get departures with delays calculated
   */
  async getDeparturesWithDelays(
    stopId: string,
    lineIds: 'all' | string[],
    timestamp?: number
  ): Promise<Array<Departure & { delayMinutes: number }>> {
    const response = await this.getDepartures(stopId, lineIds, timestamp);
    return response.departures.map(departure => ({
      ...departure,
      delayMinutes: calculateDelay(
        departure.departurePlanned,
        departure.departureLive
      ),
    }));
  }

  /**
   * Get next N departures
   */
  async getNextDepartures(
    stopId: string,
    lineIds: 'all' | string[],
    count: number
  ): Promise<Departure[]> {
    const response = await this.getDepartures(stopId, lineIds);
    return response.departures.slice(0, count);
  }
}

// ============================================
// Singleton Instance
// ============================================

export const mvvApi = new MvvApiService();

// ============================================
// Example Usage
// ============================================

/*
// Search for a stop
const stops = await mvvApi.searchTransitStops('Ostbahnhof');
const ostbahnhof = stops[0];

// Get all available lines
const { lines } = await mvvApi.getAvailableLines(ostbahnhof.id);

// Get departures for S-Bahn and U-Bahn only
const departures = await mvvApi.getDeparturesByMode(
  ostbahnhof.id,
  ['S-Bahn', 'U-Bahn']
);

// Get delayed departures
const delayed = await mvvApi.getDelayedDepartures(
  ostbahnhof.id,
  lines.map(l => l.stateless)
);

// Get next 5 departures
const next5 = await mvvApi.getNextDepartures(
  ostbahnhof.id,
  lines.map(l => l.stateless),
  5
);

// Get departures 30 minutes from now
const future = await mvvApi.getDeparturesIn(
  ostbahnhof.id,
  lines.map(l => l.stateless),
  30
);

// Group lines by mode
const grouped = await mvvApi.getAvailableLinesGrouped(ostbahnhof.id);
console.log('S-Bahn lines:', grouped['S-Bahn']);
console.log('U-Bahn lines:', grouped['U-Bahn']);
*/
