import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { everyControlReachesTheTouchFloor } from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import type { Appearance } from "../theme.js";
import { PickerField } from "./picker-field.js";

const FIELD = "When, Sat 26 Sep";

const HELD = new Date(2026, 8, 26);

const showing = async (
  mode: "date" | "time" = "date",
  appearance: Appearance = "down",
) => {
  const onPicked = jest.fn<(at: Date) => void>();
  houseLights(appearance);
  await render(
    <PickerField
      at={HELD}
      label="When"
      mode={mode}
      onPicked={onPicked}
      words="Sat 26 Sep"
    />,
  );
  return onPicked;
};

const field = () => screen.getByRole("button", { name: FIELD });

const picking = async (
  mode: "date" | "time" = "date",
  appearance: Appearance = "down",
) => {
  const picked = await showing(mode, appearance);
  await fireEvent.press(field());
  return picked;
};

const picker = (mode = "date") => screen.getByTestId(`${mode}-picker`);

const set = (at?: Date) => [{ type: "set", nativeEvent: {} }, at] as const;

const onIos = Platform.OS === "ios" ? it : it.skip;

describe("a field the platform's own picker fills", () => {
  it("reads what it holds, under the name of the term", async () => {
    await showing();

    expect(field()).toBeOnTheScreen();
    expect(screen.getByText("Sat 26 Sep")).toBeOnTheScreen();
  });

  it("keeps the picker out of the way until it is asked for", async () => {
    await showing();

    expect(screen.queryByTestId("date-picker")).toBeNull();
    expect(field()).not.toBeExpanded();
  });

  it("opens a date on the day it holds, as the platform's calendar", async () => {
    await picking();

    expect(field()).toBeExpanded();
    expect(picker().props).toMatchObject({
      value: HELD,
      mode: "date",
      display: Platform.OS === "android" ? "default" : "inline",
    });
  });

  it("opens a time as the platform's own time picker", async () => {
    await picking("time");

    expect(picker("time").props).toMatchObject({
      mode: "time",
      display: Platform.OS === "android" ? "default" : "spinner",
    });
  });

  it("opens it under the house lights the rest of the app is under", async () => {
    await picking("date", "up");

    expect(picker().props["themeVariant"]).toBe("light");
  });

  it("opens it dark with the house lights down", async () => {
    await picking();

    expect(picker().props["themeVariant"]).toBe("dark");
  });

  onIos(
    "holds the time the wheels open on, since wheels left unturned still show it",
    async () => {
      const picked = await picking("time");

      expect(picked).toHaveBeenCalledWith(HELD);
    },
  );

  it("holds nothing when a calendar opens, until a day is picked", async () => {
    const picked = await picking();

    expect(picked).not.toHaveBeenCalled();
  });

  it("hands out the day picked and closes", async () => {
    const picked = await picking();

    await fireEvent(picker(), "change", ...set(new Date(2026, 8, 5)));

    expect(picked).toHaveBeenCalledWith(new Date(2026, 8, 5));
    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  onIos(
    "keeps the time wheels open while they turn, handing out each time, until the field is pressed again",
    async () => {
      const picked = await picking("time");

      await fireEvent(
        picker("time"),
        "change",
        ...set(new Date(2026, 8, 5, 18)),
      );
      await fireEvent(
        picker("time"),
        "change",
        ...set(new Date(2026, 8, 5, 18, 30)),
      );

      expect(picked).toHaveBeenLastCalledWith(new Date(2026, 8, 5, 18, 30));
      expect(picked).toHaveBeenCalledTimes(3);
      expect(picker("time")).toBeOnTheScreen();

      await fireEvent.press(field());

      expect(screen.queryByTestId("time-picker")).toBeNull();
    },
  );

  it("changes nothing when the picker is dismissed, whatever it was showing", async () => {
    const picked = await picking();

    await fireEvent(
      picker(),
      "change",
      { type: "dismissed", nativeEvent: {} },
      new Date(2026, 8, 5),
    );

    expect(picked).not.toHaveBeenCalled();
    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("changes nothing when a value was set but none was carried", async () => {
    const picked = await picking();

    await fireEvent(picker(), "change", ...set());

    expect(picked).not.toHaveBeenCalled();
  });

  it("reaches the platform's touch floor", async () => {
    await showing();

    everyControlReachesTheTouchFloor();
  });
});
