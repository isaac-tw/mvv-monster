// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exportConfig } from "@/lib/config";
import { useDialogStore } from "@/store/dialogStore";
import { useSavedSelectionsStore } from "@/store/savedSelectionsStore";
import { ConfigDialog } from "./ConfigDialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup() {
  useSavedSelectionsStore.setState({ savedSelections: [] });
  useDialogStore.setState({ isOpen: true });
  const onImport = vi.fn();
  render(<ConfigDialog onImport={onImport} />);
  return {
    onImport,
    zone: screen.getByRole("group", { name: "Choose or drop configuration" }),
  };
}

function file(text = exportConfig([])) {
  const value = new File([text], "backup.json", { type: "application/json" });
  Object.defineProperty(value, "text", { value: async () => text });
  return value;
}

describe("configuration file selection", () => {
  it("previews a dropped file without replacing data until confirmed", async () => {
    const { onImport, zone } = setup();
    fireEvent.dragEnter(zone);
    expect(screen.getByText("Drop your file here")).toBeTruthy();
    fireEvent.drop(zone, { dataTransfer: { files: [file()] } });
    await screen.findByText("This will clear all saved stops.");
    expect(screen.getByText("backup.json")).toBeTruthy();
    expect(onImport).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Import configuration" }),
    );
    expect(onImport).toHaveBeenCalledWith([]);
  });

  it("offers the same preview through the file chooser and lets users cancel", async () => {
    const { onImport } = setup();
    const input = screen.getByLabelText("Configuration file");
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Choose file" }));
    expect(click).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { files: [file()] } });
    await screen.findByText("This will clear all saved stops.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onImport).not.toHaveBeenCalled();
    expect(useDialogStore.getState().isOpen).toBe(false);
  });

  it("clears an earlier preview when a new drop is invalid or contains multiple files", async () => {
    const { onImport, zone } = setup();
    fireEvent.drop(zone, { dataTransfer: { files: [file()] } });
    await screen.findByText("This will clear all saved stops.");
    fireEvent.drop(zone, { dataTransfer: { files: [file("invalid")] } });
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Import configuration",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true),
    );
    fireEvent.drop(zone, { dataTransfer: { files: [file(), file()] } });
    await screen.findByText("Choose one configuration file at a time.");
    expect(onImport).not.toHaveBeenCalled();
  });
});
