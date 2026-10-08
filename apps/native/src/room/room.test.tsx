import { describe, expect, it, jest } from "@jest/globals";
import { chosenOf, labelOf, refusalOf, takeOf } from "@seatscout/view-logic";
import { HOOKY_SOUTHLAKE, VILLAGE_1 } from "@seatscout/view-logic/testing";
import { fireEvent, screen } from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import {
  otherThan,
  refusedIn,
  rowBar,
  shown,
  tapped,
} from "./room.fixtures.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");

describe("the Room a Seat Group opens", () => {
  it("names the theater and the showtime it is drawing", async () => {
    await shown();

    expect(screen.getByText("AMC Village on the Parkway 9")).toBeOnTheScreen();
    expect(
      screen.getByText("Two seats together · Today 2:00p · Dolby Cinema"),
    ).toBeOnTheScreen();
  });

  it("pads every edge by the device's inset, so nothing sits under the status bar, the notch or the home indicator", async () => {
    await shown();

    expect(screen.getByTestId("stage").props["edges"]).toEqual({
      top: "additive",
      right: "additive",
      bottom: "additive",
      left: "additive",
    });
  });

  it("opens the row bar on the row the recommendation sits in", async () => {
    await shown();

    expect(rowBar().getByText("ROW D")).toBeOnTheScreen();
    expect(
      rowBar().getByText(/^4th row of 10 from the front\./),
    ).toBeOnTheScreen();
  });

  it("keeps the row's name on one line beside its sentence", async () => {
    await shown();

    expect(
      StyleSheet.flatten(rowBar().getByText("ROW D").props["style"]),
    ).toMatchObject({ flexShrink: 0 });
  });

  it("offers one way back to the list and one control to commit with", async () => {
    const room = await shown();

    await fireEvent.press(
      screen.getByRole("button", { name: "‹ Back to the list" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Take D18 and D17" }),
    );

    expect(room.left).toEqual(["back"]);
    expect(room.handedOff.map(labelOf)).toEqual(["D18·D17"]);
  });

  it("sets out the room's own standing lines where the board puts them", async () => {
    await shown();

    expect(screen.getByText("Your seats in this room")).toBeOnTheScreen();
    expect(
      screen.getByText("Clear of the front rows and the walls"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Availability is re-checked the instant you tap. SeatScout never holds seats.",
      ),
    ).toBeOnTheScreen();
  });

  it("attests one reading, its age and that nothing confirmed it", async () => {
    await shown();

    expect(screen.getByText("Read 12s ago")).toBeOnTheScreen();
    expect(screen.getByText("Only the ticket site says so")).toBeOnTheScreen();
  });

  it("counts the Seats the room will not sell", async () => {
    await shown();

    expect(screen.getByText("49 of 294 not bookable")).toBeOnTheScreen();
  });

  it("draws the same room with the house lights up", async () => {
    houseLights("up");

    await shown();

    expect(screen.getByText("AMC Village on the Parkway 9")).toBeOnTheScreen();
    expect(rowBar().getByText("ROW D")).toBeOnTheScreen();
  });
});

describe("choosing another Seat Group in the room", () => {
  it("lists every Seat Group the room offers, the recommendation first, so none needs the map", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const listed = screen.getAllByRole("radio");

    expect(listed).toHaveLength(31);
    expect(listed[0]?.props["accessibilityState"]).toEqual({ checked: true });
    expect(
      screen.getByRole("radio", {
        name: new RegExp(`^${labelOf(room.result)} `),
      }),
    ).toBe(listed[0]);
  });

  it("moves the choice the hand-off will verify", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );
    await fireEvent.press(screen.getByRole("button", { name: takeOf(other) }));

    expect(room.handedOff.map((group) => group.key)).toEqual([other.key]);
  });

  it("says in the row bar what was chosen and what happens to it", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );

    expect(rowBar().getByText(chosenOf(other))).toBeOnTheScreen();
  });

  it("checks the group it moved to and unchecks the one it left", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );

    expect(
      screen
        .getAllByRole("radio")
        .filter((held) => held.props["accessibilityState"].checked).length,
    ).toBe(1);
    expect(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) })
        .props["accessibilityState"].checked,
    ).toBe(true);
  });

  it("ticks under the thumb each time a Seat Group is chosen, and not for a refusal", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);
    const control = () =>
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) });

    await fireEvent.press(control());
    await fireEvent.press(control());
    await tapped(room, refusedIn(room).id);

    expect(selectionAsync).toHaveBeenCalledTimes(2);
  });

  it("speaks the choice and a refusal as each is made, and nothing on opening", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    said.mockClear();
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);
    const refused = refusedIn(room);
    expect(said).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );
    await tapped(room, refused.id);

    expect(said.mock.calls).toEqual([
      [chosenOf(other)],
      [refusalOf(refused, 2, false)],
    ]);
  });

  it("takes the choice from the map when a Seat an offered group holds is pressed", async () => {
    const room = await shown({ room: HOOKY_SOUTHLAKE });
    const other = otherThan(room);
    const [seat] = other.seats;
    if (seat === undefined) throw new Error("the group holds no Seat");

    await tapped(room, seat.id);

    expect(rowBar().getByText(chosenOf(other))).toBeOnTheScreen();
  });

  it("refuses a Seat no offered group holds, and says why where the row was", async () => {
    const room = await shown();
    const refused = refusedIn(room);

    await tapped(room, refused.id);

    expect(rowBar().getByText(refusalOf(refused, 2, false))).toBeOnTheScreen();
    expect(rowBar().queryByText("ROW D")).toBeNull();
  });

  it("puts the row back when the return control is pressed", async () => {
    const room = await shown();
    const refused = refusedIn(room);

    await tapped(room, refused.id);
    await fireEvent.press(
      screen.getByRole("button", { name: "Centre the map on D18 and D17" }),
    );

    expect(rowBar().getByText("ROW D")).toBeOnTheScreen();
  });
});

describe("the Room while the connection is gone", () => {
  it("puts the reason where the commit control was, and draws no control", async () => {
    await shown({ online: false, room: VILLAGE_1 });

    expect(
      screen.getByText("D18 and D17 are here while you are offline."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "They are re-checked before the ticket site opens, so that waits for the connection.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("velvet")).toBeNull();
  });

  it("says the connection is gone once, above the safe area", async () => {
    await shown({ online: false });

    expect(
      screen.getByText(
        "Offline. Seats are never cached, so nothing here is refreshed until the connection returns.",
      ),
    ).toBeOnTheScreen();
  });

  it("keeps the drawn room lit, because what is on screen is still true", async () => {
    await shown({ online: false });

    expect(rowBar().getByText("ROW D")).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^Seat /).length).toBeGreaterThan(0);
  });
});
