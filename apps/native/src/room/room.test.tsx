import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { chosenOf, labelOf, refusalOf } from "@seatscout/view-logic";
import { HOOKY_ADDISON, VILLAGE_1 } from "@seatscout/view-logic/testing";
import { fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import {
  everyControlReachesTheTouchFloor,
  everyControlSaysWhatItIs,
} from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import {
  otherThan,
  refusedIn,
  rowBar,
  seatNamed,
  shown,
} from "./room.fixtures.js";

const mockTicked = jest.fn();

jest.mock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);
jest.mock("expo-haptics", () => ({ selectionAsync: () => mockTicked() }));

beforeEach(() => {
  mockTicked.mockClear();
});

describe("the Room a Seat Group opens", () => {
  it("names the theater and the showtime it is drawing", async () => {
    await shown();

    expect(screen.getByText("Cinemark Frisco Square and XD")).toBeOnTheScreen();
    expect(
      screen.getByText("Two seats together · Today 1:25p"),
    ).toBeOnTheScreen();
  });

  it("opens the row bar on the row the recommendation sits in", async () => {
    await shown();

    expect(rowBar().getByText("ROW G")).toBeOnTheScreen();
    expect(
      rowBar().getByText(/^7th row of 10 from the front\./),
    ).toBeOnTheScreen();
  });

  it("offers one way back to the list and one control to commit with", async () => {
    const room = await shown();

    await fireEvent.press(
      screen.getByRole("button", { name: "‹ Back to the list" }),
    );
    await fireEvent.press(screen.getByTestId("velvet"));

    expect(room.left).toEqual(["back"]);
    expect(room.handedOff.map(labelOf)).toEqual(["G14·G13"]);
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

    expect(screen.getByText("1 source · read 12s ago")).toBeOnTheScreen();
    expect(
      screen.getByText("Not confirmed by a second source"),
    ).toBeOnTheScreen();
  });

  it("counts the Seats the room will not sell", async () => {
    await shown();

    expect(screen.getByText("3 of 294 not bookable")).toBeOnTheScreen();
  });

  it("gives every control a name and the platform's own touch floor", async () => {
    await shown();

    everyControlSaysWhatItIs();
    everyControlReachesTheTouchFloor();
  });

  it("draws the same room with the house lights up", async () => {
    houseLights("up");

    await shown();

    expect(screen.getByText("Cinemark Frisco Square and XD")).toBeOnTheScreen();
    expect(rowBar().getByText("ROW G")).toBeOnTheScreen();
  });
});

describe("choosing another Seat Group in the room", () => {
  it("moves the choice the hand-off will verify", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
    const other = otherThan(room);

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );
    await fireEvent.press(screen.getByTestId("velvet"));

    expect(room.handedOff.map((group) => group.key)).toEqual([other.key]);
  });

  it("says in the row bar what was chosen and what happens to it", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
    const other = otherThan(room);

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );

    expect(rowBar().getByText(chosenOf(other))).toBeOnTheScreen();
  });

  it("checks the group it moved to and unchecks the one it left", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
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

  it("ticks once under the thumb when the choice moves, and not when it stays", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
    const other = otherThan(room);
    const control = () =>
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) });

    await fireEvent.press(control());
    expect(mockTicked).toHaveBeenCalledTimes(1);

    await fireEvent.press(control());
    expect(mockTicked).toHaveBeenCalledTimes(1);
  });

  it("speaks the choice and a refusal as each is made, and nothing on opening", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    said.mockClear();
    const room = await shown({ room: HOOKY_ADDISON });
    const other = otherThan(room);
    const refused = refusedIn(room);
    expect(said).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("radio", { name: new RegExp(`^${labelOf(other)} `) }),
    );
    await fireEvent.press(seatNamed(refused.id));

    expect(said.mock.calls).toEqual([
      [chosenOf(other)],
      [refusalOf(refused, 2, false)],
    ]);
  });

  it("takes the choice from the map when a Seat an offered group holds is pressed", async () => {
    const room = await shown({ room: HOOKY_ADDISON });
    const other = otherThan(room);
    const [seat] = other.seats;
    if (seat === undefined) throw new Error("the group holds no Seat");

    await fireEvent.press(seatNamed(seat.id));

    expect(rowBar().getByText(chosenOf(other))).toBeOnTheScreen();
  });

  it("refuses a Seat no offered group holds, and says why where the row was", async () => {
    const room = await shown();
    const refused = refusedIn(room);

    await fireEvent.press(seatNamed(refused.id));

    expect(rowBar().getByText(refusalOf(refused, 2, false))).toBeOnTheScreen();
    expect(rowBar().queryByText("ROW G")).toBeNull();
  });

  it("puts the row back when the return control is pressed", async () => {
    const room = await shown();
    const refused = refusedIn(room);

    await fireEvent.press(seatNamed(refused.id));
    await fireEvent.press(
      screen.getByRole("button", { name: "Back to G14 G13" }),
    );

    expect(rowBar().getByText("ROW G")).toBeOnTheScreen();
  });
});

describe("the Room while the connection is gone", () => {
  it("puts the reason where the commit control was, and draws no control", async () => {
    await shown({ online: false, room: VILLAGE_1 });

    expect(
      screen.getByText("G14 and G13 are here while you are offline."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Continuing re-checks them with the Source, so it waits for the connection.",
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

    expect(rowBar().getByText("ROW G")).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^Seat /).length).toBeGreaterThan(0);
  });
});
