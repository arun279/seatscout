import { describe, expect, it } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native";
import { asking, NEAR, submit, TODAY } from "../../test/ask.js";

const press = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name }));
};

const handedOut = (found: Awaited<ReturnType<typeof asking>>["found"]) =>
  found.mock.calls.at(-1)?.[0];

const READING = /days of reading\. The nearest day comes back first\.$/;

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

  it("sets a range's first day and then its last on the calendar", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("A range");
    await press("Monday 21 September");
    await press("Thursday 24 September");
    await submit();

    expect(handedOut(found)).toMatchObject({
      date: "2026-09-21",
      when: { kind: "range", first: "2026-09-21", last: "2026-09-24" },
    });
    expect(screen.getByText("Mon 21 to Thu 24 Sep")).toBeOnTheScreen();
  });

  it("adds each day tapped on the calendar to some days, and hands them out nearest first", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("Some days");
    await press("Tuesday 22 September");
    await press("Monday 21 September");
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
    expect(screen.getByText("Sat 19, Mon 21, Tue 22 Sep")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Monday 21 September" }),
    ).toBeSelected();
  });

  it("takes a day out of some days when it is tapped again on the calendar", async () => {
    const { found } = await asking({
      terms: {
        ...NEAR,
        when: { kind: "days", dates: [TODAY, "2026-09-23"] },
      },
    });

    await press("Wednesday 23 September");
    await submit();

    expect(handedOut(found)).toEqual(NEAR);
  });

  it("moves the one day to the day tapped", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("Thursday 24 September");
    await submit();

    expect(handedOut(found)).toEqual({ ...NEAR, date: "2026-09-24" });
  });

  it("shows any day's week on the calendar and takes no tap", async () => {
    await asking({ terms: NEAR });

    await press("Any day");

    expect(screen.getByLabelText("Tuesday 22 September")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Tuesday 22 September" }),
    ).toBeNull();
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

  it("keeps the last day of some days when it is tapped again", async () => {
    const { found } = await asking({ terms: NEAR });

    await press("Some days");
    await press("Today, Saturday 19 September");
    await submit();

    expect(handedOut(found)).toEqual(NEAR);
    expect(
      screen.getByRole("button", { name: "Today, Saturday 19 September" }),
    ).toBeSelected();
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
    expect(
      screen.getByRole("button", { name: "Monday 21 September" }),
    ).toBeSelected();
  });
});
