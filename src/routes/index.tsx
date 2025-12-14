import { createFileRoute } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { SearchDialog } from "@/components/dialog/SearchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mvvApi } from "@/services/mvv-service";
import { useDialogStore } from "@/store/dialogStore";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { openDialog } = useDialogStore();

  const [departuresByStation, setDeparturesByStation] = useState([]);
  const [savedSelections, setSavedSelections] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const storedSelections = localStorage.getItem("mvv.savedSelections");
        if (!storedSelections) return;
        const parsedSelections = JSON.parse(storedSelections);
        if (!Array.isArray(parsedSelections)) return;
        setSavedSelections(parsedSelections);

        const results = await Promise.all(parsedSelections.map(({ id, lines }) => mvvApi.getDeparturesWithDelays(id, lines)));

        if (!cancelled) { setDeparturesByStation(results) }
      } catch (err) {
        console.warn("Failed to load saved selections", err);
      }
    };

    load();
    return () => { cancelled = true };
  }, []);

  const removeSavedSelection = (id) => {
    const updatedSelections = savedSelections.filter((selection) => selection.id !== id);
    setSavedSelections(updatedSelections);
    localStorage.setItem("mvv.savedSelections", JSON.stringify(updatedSelections));
  };

  const renderSavedSelections = (selections) =>
    selections?.map(({ id, stop: { name } }) => (
      <div key={id}>
        <Badge>
          {name}
          <Button
            variant="secondary"
            size="icon-xs"
            className="rounded-full"
            onClick={() => removeSavedSelection(id)}
          >
            <XIcon />
          </Button>
        </Badge>
      </div>
    ));

  const renderDeparturesByStation = (departuresByStation) =>
    departuresByStation.map((departures) => (
      <div key={departures.id}>
        {departures?.map(
          ({ departureLive, departurePlanned, line: { number, direction } }) => (
            <div
              key={`${number}-${direction}-${departurePlanned}`}
              className="flex gap-5"
            >
              <span>
                [{number}] {direction}
              </span>
              <span>
                <time dateTime={departurePlanned}>{departurePlanned}</time>
                {departureLive && (
                  <>
                    &nbsp;/&nbsp;
                    <time
                      dateTime={departureLive}
                      className={
                        departureLive === departurePlanned
                          ? "text-green-600"
                          : "text-red-500"
                      }
                    >
                      {departureLive}
                    </time>
                  </>
                )}
              </span>
            </div>
          ),
        )}
      </div>
    ));

  return (
    <div className="min-h-screen">
      <div>{renderSavedSelections(savedSelections)}</div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          onClick={() => {
            openDialog(<SearchDialog />, "Add New Route");
          }}
        >
          ADD
        </Button>
        <div className="text-sm text-muted">
          Saved: {savedSelections.length}
        </div>
      </div>
      <div>
        <h3>Status</h3>
        <div className="flex flex-col gap-4">
          {renderDeparturesByStation(departuresByStation)}
        </div>
      </div>
    </div>
  );
}
