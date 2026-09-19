import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { everyControlReachesTheTouchFloor } from "../../test/floors.js";

import { DateField, dateAt, listingDateOf } from "./date-field.js";

const FIELD = "When, Sat 26 Sep";

const showing = async (onDate = jest.fn<(date: string) => void>()) => {
  await render(
    <DateField
      date="2026-09-26"
      label="When"
      onDate={onDate}
      words="Sat 26 Sep"
    />,
  );
  return onDate;
};

const picking = async (onDate = jest.fn<(date: string) => void>()) => {
  await showing(onDate);
  await fireEvent.press(screen.getByRole("button", { name: FIELD }));
  return onDate;
};

const set = (at: Date) => [{ type: "set", nativeEvent: {} }, at] as const;

describe("the date a query is for", () => {
  it("reads the day it was given, under the name of the term", async () => {
    await showing();

    expect(screen.getByRole("button", { name: FIELD })).toBeOnTheScreen();
    expect(screen.getByText("Sat 26 Sep")).toBeOnTheScreen();
  });

  it("keeps the platform's own picker out of the way until it is asked for", async () => {
    await showing();

    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("opens the platform's own picker on the day it already holds", async () => {
    await picking();

    expect(screen.getByTestId("date-picker")).toBeOnTheScreen();
  });

  it("takes the day that was picked as the date of the query", async () => {
    const dated = await picking();

    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      ...set(new Date(2026, 8, 5)),
    );

    expect(dated).toHaveBeenCalledWith("2026-09-05");
  });

  it("closes the picker once a day is picked", async () => {
    await picking();

    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      ...set(new Date(2026, 8, 5)),
    );

    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("changes nothing when the picker is dismissed", async () => {
    const dated = await picking();

    await fireEvent(screen.getByTestId("date-picker"), "change", {
      type: "dismissed",
      nativeEvent: {},
    });

    expect(dated).not.toHaveBeenCalled();
    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("reaches the platform's touch floor", async () => {
    await showing();

    everyControlReachesTheTouchFloor();
  });
});

describe("the day a listing is asked for", () => {
  it("is written the way a listing names a date, padded", () => {
    expect(listingDateOf(new Date(2026, 0, 2))).toBe("2026-01-02");
    expect(listingDateOf(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("is read back as the same day where the person stands", () => {
    const at = dateAt("2026-09-05");

    expect([at.getFullYear(), at.getMonth(), at.getDate()]).toEqual([
      2026, 8, 5,
    ]);
    expect(listingDateOf(dateAt("2026-03-01"))).toBe("2026-03-01");
  });
});
