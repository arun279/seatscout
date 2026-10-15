import { describe, expect, it } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import { cleanup, fireEvent, screen } from "@testing-library/react-native";
import { asking, PLAYING, submit, WHOLE } from "../../test/ask.js";

const press = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name }));
};

const handedOut = (found: Awaited<ReturnType<typeof asking>>["found"]) =>
  found.mock.calls.at(-1)?.[0];

describe("the narrowing terms the Ask sheet carries", () => {
  it("hands out every Format, Comfort and Chain chip pressed, in the order each set lists them", async () => {
    const { found } = await asking({ focus: "showtimes", terms: WHOLE });

    await press("IMAX");
    await press("Dolby Cinema");
    await press("Recliners");
    await press("AMC");
    await submit();

    expect(handedOut(found)).toMatchObject({
      formats: ["Dolby Cinema", "IMAX"],
      amenities: ["Recliners"],
      chains: ["AMC"],
    });
  });

  it("shows the chips the query already holds as chosen, and lets one be taken out", async () => {
    const { found } = await asking({
      focus: "showtimes",
      terms: { ...WHOLE, formats: ["IMAX"], chains: ["AMC", "Landmark"] },
    });

    expect(screen.getByRole("button", { name: "IMAX" })).toBeSelected();
    await press("AMC");
    await submit();

    expect(handedOut(found)).toMatchObject({
      formats: ["IMAX"],
      chains: ["Landmark"],
    });
  });

  it("offers the Theaters playing near the area as chips once they are read, and hands out the one pressed", async () => {
    const { found } = await asking({
      focus: "showtimes",
      terms: WHOLE,
      playing: PLAYING,
    });

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Cinemark Dallas XD and IMAX",
      }),
    );
    await submit();

    expect(handedOut(found)?.theaters).toEqual(["aacbt"]);
  });

  it("offers no Theater until the area's Theaters are read", async () => {
    await asking({ focus: "showtimes", terms: WHOLE });

    expect(screen.queryByText("Theater")).toBeNull();
  });

  it("shows accessible seating on when the query asks for it, and off when it does not", async () => {
    await asking({
      focus: "partySize",
      terms: { ...WHOLE, accessibleSeating: true },
    });
    expect(
      screen.getByRole("switch", { name: "Accessible seating" }),
    ).toBeChecked();
    await cleanup();

    await asking({ focus: "partySize", terms: WHOLE });
    expect(
      screen.getByRole("switch", { name: "Accessible seating" }),
    ).not.toBeChecked();
  });

  it("hands out accessible seating once it is switched on", async () => {
    const { found } = await asking({ focus: "partySize", terms: WHOLE });

    await fireEvent.press(
      screen.getByRole("switch", { name: "Accessible seating" }),
    );
    await submit();

    expect(handedOut(found)?.accessibleSeating).toBe(true);
  });

  it("hands out the time window's two ends as the clock a window is asked by, and drops an end that was cleared", async () => {
    const { found } = await asking({
      focus: "window",
      terms: { ...WHOLE, until: "23:00" },
    });

    await press("From, Any time");
    await fireEvent(
      screen.getByTestId("time-picker"),
      "change",
      { type: "set", nativeEvent: {} },
      new Date(2026, 8, 19, 18, 30),
    );
    await press("Clear, Until");
    await submit();

    expect(handedOut(found)).toEqual({ ...WHOLE, from: "18:30" });
  });

  it("hands out the Seat Profile it was opened with when nothing in it moved", async () => {
    const { found } = await asking({ focus: "showtimes", terms: WHOLE });

    await submit();

    expect(found.mock.calls.at(-1)?.[1]).toBe(REFERENCE);
  });
});
