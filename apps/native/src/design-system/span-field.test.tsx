import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { SpanField } from "./span-field.js";

const spanning = async () => {
  const onSpan = jest.fn<(first: string, last: string) => void>();
  await render(
    <SpanField
      first="2026-09-04"
      labels={["From", "Until"]}
      last="2026-09-13"
      onSpan={onSpan}
      endWords={["Fri 4 Sep", "Sun 13 Sep"]}
      words="Fri 4 to Sun 13 Sep"
    />,
  );
  return onSpan;
};

const set = (at: Date) => [{ type: "set", nativeEvent: {} }, at] as const;

const onIos = Platform.OS === "ios" ? describe : describe.skip;
const onAndroid = Platform.OS === "android" ? describe : describe.skip;

describe("a range of days", () => {});

onIos("a range of days on iOS, as two compact date pickers", () => {
  it("offers its first and last day as two fields, From and Until", async () => {
    await spanning();

    expect(
      screen.getByRole("button", { name: "From, Fri 4 Sep" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Until, Sun 13 Sep" }),
    ).toBeOnTheScreen();
  });

  it("moves the first day and keeps the last", async () => {
    const spanned = await spanning();

    await fireEvent.press(
      screen.getByRole("button", { name: "From, Fri 4 Sep" }),
    );
    expect(screen.getByTestId("date-picker").props["value"]).toEqual(
      new Date(2026, 8, 4),
    );
    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      ...set(new Date(2026, 8, 6)),
    );

    expect(spanned).toHaveBeenCalledWith("2026-09-06", "2026-09-13");
  });

  it("moves the last day and keeps the first", async () => {
    const spanned = await spanning();

    await fireEvent.press(
      screen.getByRole("button", { name: "Until, Sun 13 Sep" }),
    );
    expect(screen.getByTestId("date-picker").props["value"]).toEqual(
      new Date(2026, 8, 13),
    );
    await fireEvent(
      screen.getByTestId("date-picker"),
      "change",
      ...set(new Date(2026, 8, 20)),
    );

    expect(spanned).toHaveBeenCalledWith("2026-09-04", "2026-09-20");
  });
});

onAndroid("a range of days on Android, as Material's range picker", () => {
  const dialog = () => screen.getByTestId("range-picker");

  it("says the range it holds, and keeps the picker away until asked", async () => {
    await spanning();

    expect(
      screen.getByRole("button", { name: "Fri 4 to Sun 13 Sep" }),
    ).toBeOnTheScreen();
    expect(screen.queryAllByTestId("range-picker")).toHaveLength(0);
  });

  it("opens on the range it holds and hands out the range picked, by the day it names", async () => {
    const spanned = await spanning();

    await fireEvent.press(
      screen.getByRole("button", { name: "Fri 4 to Sun 13 Sep" }),
    );
    expect(dialog().props).toMatchObject({
      initialStartDate: "2026-09-04T00:00:00Z",
      initialEndDate: "2026-09-13T00:00:00Z",
    });
    await fireEvent(dialog(), "dateRangeSelected", {
      start: new Date(Date.UTC(2026, 8, 6)),
      end: new Date(Date.UTC(2026, 8, 9)),
    });

    expect(spanned).toHaveBeenCalledWith("2026-09-06", "2026-09-09");
    expect(screen.queryAllByTestId("range-picker")).toHaveLength(0);
  });

  it("changes nothing while the range has no end, or when the picker is dismissed", async () => {
    const spanned = await spanning();

    await fireEvent.press(
      screen.getByRole("button", { name: "Fri 4 to Sun 13 Sep" }),
    );
    await fireEvent(dialog(), "dateRangeSelected", {
      start: new Date(Date.UTC(2026, 8, 6)),
      end: null,
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Fri 4 to Sun 13 Sep" }),
    );
    await fireEvent(dialog(), "dateRangeSelected", {
      start: null,
      end: new Date(Date.UTC(2026, 8, 9)),
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Fri 4 to Sun 13 Sep" }),
    );
    await fireEvent(dialog(), "dismissRequest");

    expect(spanned).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("range-picker")).toHaveLength(0);
  });
});
