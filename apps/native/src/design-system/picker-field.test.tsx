import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { houseLights } from "../../test/lights.js";
import type { Appearance } from "../theme.js";
import { PickerField } from "./picker-field.js";

const FIELD = "From, 7:00p";

const HELD = new Date(2026, 8, 26, 19);

const showing = async (appearance: Appearance = "down") => {
  const onPicked = jest.fn<(at: Date) => void>();
  houseLights(appearance);
  await render(
    <PickerField at={HELD} label="From" onPicked={onPicked} words="7:00p" />,
  );
  return onPicked;
};

const field = () => screen.getByRole("button", { name: FIELD });

const picking = async (appearance: Appearance = "down") => {
  const picked = await showing(appearance);
  await fireEvent.press(field());
  return picked;
};

const picker = () => screen.getByTestId("time-picker");

const set = (at?: Date) => [{ type: "set", nativeEvent: {} }, at] as const;

const onIos = Platform.OS === "ios" ? it : it.skip;
const onAndroid = Platform.OS === "android" ? it : it.skip;

describe("a time field the platform's own picker fills", () => {
  it("reads what it holds, under the name of the term", async () => {
    await showing();

    expect(field()).toBeOnTheScreen();
    expect(screen.getByText("7:00p")).toBeOnTheScreen();
  });

  it("keeps the picker out of the way until it is asked for", async () => {
    await showing();

    expect(screen.queryByTestId("time-picker")).toBeNull();
    expect(field()).not.toBeExpanded();
  });

  it("opens the platform's own time picker on the time it holds", async () => {
    await picking();

    expect(field()).toBeExpanded();
    expect(picker().props).toMatchObject({
      value: HELD,
      mode: "time",
      display: Platform.OS === "android" ? "default" : "spinner",
    });
  });

  it("opens it under the house lights the rest of the app is under", async () => {
    await picking("up");

    expect(picker().props["themeVariant"]).toBe("light");
  });

  it("opens it dark with the house lights down", async () => {
    await picking();

    expect(picker().props["themeVariant"]).toBe("dark");
  });

  onIos(
    "holds the time the wheels open on, since wheels left unturned still show it",
    async () => {
      const picked = await picking();

      expect(picked).toHaveBeenCalledWith(HELD);
    },
  );

  onIos(
    "keeps the wheels open while they turn, handing out each time, until the field is pressed again",
    async () => {
      const picked = await picking();

      await fireEvent(picker(), "change", ...set(new Date(2026, 8, 5, 18)));
      await fireEvent(picker(), "change", ...set(new Date(2026, 8, 5, 18, 30)));

      expect(picked).toHaveBeenLastCalledWith(new Date(2026, 8, 5, 18, 30));
      expect(picked).toHaveBeenCalledTimes(3);
      expect(picker()).toBeOnTheScreen();

      await fireEvent.press(field());

      expect(screen.queryByTestId("time-picker")).toBeNull();
    },
  );

  onAndroid(
    "holds nothing when the clock opens, until a time is picked",
    async () => {
      const picked = await picking();

      expect(picked).not.toHaveBeenCalled();
    },
  );

  onAndroid("hands out the time picked and closes", async () => {
    const picked = await picking();

    await fireEvent(picker(), "change", ...set(new Date(2026, 8, 5, 18)));

    expect(picked).toHaveBeenCalledWith(new Date(2026, 8, 5, 18));
    expect(screen.queryByTestId("time-picker")).toBeNull();
  });

  onAndroid("changes nothing when the clock is dismissed", async () => {
    const picked = await picking();

    await fireEvent(
      picker(),
      "change",
      { type: "dismissed", nativeEvent: {} },
      new Date(2026, 8, 5, 18),
    );

    expect(picked).not.toHaveBeenCalled();
    expect(screen.queryByTestId("time-picker")).toBeNull();
  });

  onAndroid(
    "changes nothing when a time was set but none was carried",
    async () => {
      const picked = await picking();

      await fireEvent(picker(), "change", ...set());

      expect(picked).not.toHaveBeenCalled();
    },
  );
});
