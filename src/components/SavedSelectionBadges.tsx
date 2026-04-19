import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SavedSelection } from "@/types/storage";

type SavedSelectionBadgesProps = {
  onEdit: (selection: SavedSelection) => void;
  onRemove: (selection: SavedSelection) => void;
  selections: SavedSelection[];
};

export function SavedSelectionBadges({
  onEdit,
  onRemove,
  selections,
}: SavedSelectionBadgesProps) {
  return selections.map((selection) => (
    <div key={selection.id}>
      <Badge
        className="flex cursor-pointer gap-2 px-2 py-1"
        onClick={() => onEdit(selection)}
      >
        {selection.stop.name}
        <Button
          variant="secondary"
          size="icon-xs"
          className="rounded-full"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(selection);
          }}
        >
          <XIcon />
        </Button>
      </Badge>
    </div>
  ));
}
