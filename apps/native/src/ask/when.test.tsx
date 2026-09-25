import { describe, expect, it } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { asking, NEAR, submit, TODAY } from "../../test/ask.js";

const press = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name }));
};

const pick = async (picker: string, at: Date) => {
  await fireEvent(
    screen.getByTestId(picker),
    "change",
    { type: "set", nativeEvent: {} },
    at,
  );
};

const handedOut = (found: Awaited<ReturnType<typeof asking>>["found"]) =>
  found.mock.calls.at(-1)?.[0];

const READING = /days of reading\. The nearest day comes back first\.$/;

const onIos = Platform.OS === "ios" ? it : it.skip;
const onAndroid = Platform.OS === "android" ? it : it.skip;

describe("the when term in the Ask sheet", () => {
  it("offers its four readings, and opens on the one the query holds", async () => {
    await asking({
      terms: {
        ...NEAR,
        when: { kind: "range", first: TODAY, last: "2026-09-21" },
      },
    });

    for (const reading of ["One day", "Some days", "Any day"])
      expect(screen.getByRole("button", { name: reading })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "A range" })).toBeSelected();
  });

  it("opens on one day when the query holds one", async () => {
    await asking({ terms: NEAR });

    expect(screen.getByRole("button", { name: "One day" })).toBeSelected();
    expect(screen.queryByText(READING)).toBeNull();
    expect(screen.queryByTestId("cost")).toBeNull();
  });

  it("hands out any day from today, and says what those days cost under Find seats", async () => {
    const { found } = await asking({
      terms: { ...NEAR, date: "2026-09-24" },
    });

    await press("Any day");
    await submit();

    expect(screen.getByText("Any day in the next 7 days")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "7 days is 7 days of reading. The nearest day comes back first.",
      ),
    ).toBeOnTheScreen();
    expect(handedOut(found)).toEqual({
      ...NEAR,
      when: { kind: "any" },
    });
  });

  it("starts a range on the day the query holds and runs it a week", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("A range");
    await submit();

    expect(handedOut(found)).toEqual({
      ...NEAR,
      when: { kind: "range", first: TODAY, last: "2026-09-25" },
    });
  });

  onIos("moves the range's last day with the Until picker", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("A range");
    await press("Until, Fri 25 Sep");
    await pick("date-picker", new Date(2026, 8, 22));
    await submit();

    expect(handedOut(found)?.when).toEqual({
      kind: "range",
      first: TODAY,
      last: "2026-09-22",
    });
  });

  onAndroid("moves the whole range with Material's range picker", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("A range");
    await press("Sat 19 to Fri 25 Sep");
    await fireEvent(screen.getByTestId("range-picker"), "dateRangeSelected", {
      start: new Date(Date.UTC(2026, 8, 20)),
      end: new Date(Date.UTC(2026, 8, 23)),
    });
    await submit();

    expect(handedOut(found)).toMatchObject({
      date: "2026-09-20",
      when: { kind: "range", first: "2026-09-20", last: "2026-09-23" },
    });
  });

  it("adds each day picked to some days, and hands out the days nearest first", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("Some days");
    await press("When, Add a day");
    await pick("date-picker", new Date(2026, 8, 22));
    await press("When, Add a day");
    await pick("date-picker", new Date(2026, 8, 21));
    await submit();

    expect(
      screen.getByText(
        "3 days is 3 days of reading. The nearest day comes back first.",
      ),
    ).toBeOnTheScreen();
    expect(handedOut(found)?.when).toEqual({
      kind: "days",
      dates: [TODAY, "2026-09-21", "2026-09-22"],
    });
  });

  it("opens the picker for another day on the last day picked", async () => {
    await asking({
      terms: {
        ...NEAR,
        when: { kind: "days", dates: [TODAY, "2026-09-21", "2026-09-23"] },
      },
    });

    await press("When, Add a day");

    expect(screen.getByTestId("date-picker").props["value"]).toEqual(
      new Date(2026, 8, 23),
    );
  });

  it("opens a time the query does not hold at seven in the evening", async () => {
    await asking({ terms: NEAR });

    await press("From, Any time");
    const at = screen.getByTestId("time-picker").props["value"];

    expect([at.getHours(), at.getMinutes()]).toEqual([19, 0]);
  });

  it("says the times the query holds on the clock a person reads", async () => {
    await asking({ terms: { ...NEAR, from: "18:30", until: "23:05" } });

    expect(
      screen.getByRole("button", { name: "From, 6:30p" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Until, 11:05p" }),
    ).toBeOnTheScreen();
  });

  it("takes a picked day out when its chip is pressed, and keeps the last one", async () => {
    const { found } = await asking({
      terms: {
        ...NEAR,
        when: { kind: "days", dates: [TODAY, "2026-09-23"] },
      },
    });

    await press("Today");
    await press("Wed 23 Sep");
    await submit();

    expect(handedOut(found)).toEqual({ ...NEAR, date: "2026-09-23" });
    expect(screen.getByRole("button", { name: "Wed 23 Sep" })).toBeSelected();
  });

  it("goes back to one day, the nearest the query held, from any other reading", async () => {
    const { found } = await asking({
      terms: {
        ...NEAR,
        date: "2026-09-21",
        when: { kind: "days", dates: ["2026-09-21", "2026-09-23"] },
      },
    });

    await press("One day");
    await submit();

    expect(handedOut(found)).toEqual({ ...NEAR, date: "2026-09-21" });
  });

  it("keeps the day it holds when some days is chosen, until another is added", async () => {
    const { found } = await asking({ terms: { ...NEAR, date: "2026-09-21" } });

    await press("Some days");
    await submit();

    expect(handedOut(found)).toEqual({ ...NEAR, date: "2026-09-21" });
    expect(screen.getByRole("button", { name: "Mon 21 Sep" })).toBeSelected();
  });
});
