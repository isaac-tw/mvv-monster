import type { DepartureGroup } from "@/lib/departure-groups";
import { getLineColors } from "@/lib/line-colors";
import { calculateDelay } from "@/lib/utils";
import type { Departure } from "@/services/mvv-service";

type DepartureGroupCardProps = {
  group: DepartureGroup;
};

type DepartureTimeProps = Pick<Departure, "departureLive" | "departurePlanned">;

function getDepartureKey(departure: Departure, index: number) {
  return [
    departure.departureDate,
    departure.departurePlanned,
    departure.departureLive,
    departure.track,
    index,
  ].join(":");
}

function DepartureTime({
  departureLive,
  departurePlanned,
}: DepartureTimeProps) {
  if (departureLive === "Halt entfällt") {
    return (
      <div className="flex items-center gap-3 font-mono text-sm">
        <span className="line-through text-gray-400">{departurePlanned}</span>
        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
          {departureLive}
        </span>
      </div>
    );
  }

  const delay = departureLive
    ? calculateDelay(departurePlanned, departureLive)
    : null;

  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      {delay === null ? (
        <span className="text-green-700 font-semibold flex items-center gap-2">
          {departurePlanned || "-"}
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            TBD
          </span>
        </span>
      ) : delay > 0 ? (
        <>
          <span className="line-through text-gray-400">{departurePlanned}</span>
          <span className="text-red-600 font-semibold">{departureLive}</span>
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
            +{delay} min
          </span>
        </>
      ) : (
        <span className="text-green-700 font-semibold flex items-center gap-2">
          {departureLive}
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
            On time
          </span>
        </span>
      )}
    </div>
  );
}

export function DepartureGroupCard({ group }: DepartureGroupCardProps) {
  const firstDeparture = group.departures[0];

  if (!firstDeparture) return null;

  return (
    <div>
      <div className="text-gray-500 font-semibold mb-2">
        <span
          className="text-sm font-bold px-2 py-1 rounded mr-1"
          style={{
            backgroundColor: getLineColors(firstDeparture.line).background,
            color: getLineColors(firstDeparture.line).text,
          }}
        >
          {firstDeparture.line.number}
        </span>
        <span className="font-medium text-gray-700">
          {firstDeparture.line.direction}
        </span>
      </div>
      <div className="flex flex-col gap-1 ml-0.5">
        {group.departures.slice(0, 5).map((departure, index) => (
          <DepartureTime
            key={getDepartureKey(departure, index)}
            {...departure}
          />
        ))}
      </div>
    </div>
  );
}
