import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import {
  HOOKY_ADDISON,
  HOOKY_TICKETING,
  OFFLINE_HERE,
  opened,
  take,
  taken,
} from "../../test/hand-off.js";
import { WARM_UP, warmTheCorpus } from "../../test/rooms.js";

beforeAll(warmTheCorpus, WARM_UP);

describe("the hand-off sheet as it opens", () => {
  it("says its heading to a screen reader, since no field in it takes the keyboard", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    said.mockClear();

    await opened();

    expect(said).toHaveBeenCalledWith(HOOKY_ADDISON);
  });

  it("names the Theater, the showing and the Seat Group, and offers one control that names the seats it takes", async () => {
    await opened();

    expect(screen.getByRole("header")).toHaveTextContent(HOOKY_ADDISON);
    expect(screen.getByText("Today 9:00a · SDX")).toBeOnTheScreen();
    expect(screen.getByText("Bookable when read 0s ago")).toBeOnTheScreen();
    expect(screen.getByText("Only the ticket site says so")).toBeOnTheScreen();
    expect(screen.getByText("E12·E11, yours")).toBeOnTheScreen();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tapping re-checks these seats, then opens the ticket site at this showtime. SeatScout never holds seats.",
    );
    expect(screen.getByRole("status").props["accessibilityLiveRegion"]).toBe(
      "polite",
    );
    expect(screen.getAllByTestId("velvet")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Take E12 and E11" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId("lost", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("ages the reading it offers while the sheet is open", async () => {
    const { clock } = await opened();

    await act(() => clock.advance(8_000));

    expect(screen.getByText("Bookable when read 8s ago")).toBeOnTheScreen();
  });

  it("closes when its back control is pressed", async () => {
    const { onClose } = await opened();

    await fireEvent.press(
      screen.getByRole("button", { name: "Back to the list" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("no ticketing URL opens before Re-verification confirms", () => {
  it("opens nothing while the Source has not answered, then opens the URL the Showtime carried, as it carried it", async () => {
    const counter = await opened();
    counter.holdSeatMaps();

    await take("E12 and E11");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Checking E12 and E11 are still there",
    );
    expect(screen.getByRole("status").props["accessibilityLiveRegion"]).toBe(
      "polite",
    );
    expect(screen.queryByRole("button", { name: /^Take/ })).toBeNull();
    expect(counter.checkout).not.toHaveBeenCalled();

    counter.releaseSeatMaps();
    const verified = await counter.answered();

    expect(verified.ok).toBe(true);
    expect(counter.checkout.mock.calls).toEqual([[HOOKY_TICKETING]]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Still there. Opening the ticket site for 9:00a at Hooky Entertainment Addison + SDX.",
    );
  });

  it("opens nothing when the Seat Group was taken since the search", async () => {
    const { checkout } = await taken({ statuses: { E12: "X" } });

    expect(checkout).not.toHaveBeenCalled();
  });

  it("opens nothing when the Source could not be reached", async () => {
    const { checkout } = await taken({ status: 500 });

    expect(checkout).not.toHaveBeenCalled();
  });

  it("opens nothing when the sheet was closed before the Source answered", async () => {
    const counter = await opened();
    counter.holdSeatMaps();
    await take("E12 and E11");
    await screen.findByText("Checking E12 and E11 are still there");

    await act(() => screen.unmount());
    counter.releaseSeatMaps();
    await counter.answered();

    expect(counter.checkout).not.toHaveBeenCalled();
    expect(counter.onClose).not.toHaveBeenCalled();
  });
});

describe("closing the in-app browser", () => {
  it("closes the sheet only once the browser is closed, so the moviegoer lands where they were", async () => {
    const counter = await opened();
    await take("E12 and E11");
    await counter.answered();

    expect(counter.onClose).not.toHaveBeenCalled();

    await counter.closeTheBrowser();

    expect(counter.onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves the stack alone when the sheet had already gone by the time the browser closed", async () => {
    const counter = await opened();
    await take("E12 and E11");
    await counter.answered();

    await act(() => screen.unmount());
    await counter.closeTheBrowser();

    expect(counter.onClose).not.toHaveBeenCalled();
  });
});

describe("a browser that cannot open", () => {
  it("offers the take control again and keeps the sheet where it was", async () => {
    const counter = await opened();
    counter.checkout.mockRejectedValueOnce(new Error("no browser"));

    await take("E12 and E11");
    await counter.answered();

    expect(
      screen.getByRole("button", { name: "Take E12 and E11" }),
    ).toBeOnTheScreen();
    expect(counter.onClose).not.toHaveBeenCalled();
  });
});

describe("offline", () => {
  it("withdraws the take control and says why in its place", async () => {
    await opened(false);

    expect(screen.queryByRole("button", { name: /^Take/ })).toBeNull();
    expect(screen.queryByTestId("velvet")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE_HERE);
  });

  it("gives the control back when the connection returns, and takes it away again when it drops", async () => {
    const counter = await opened(false);

    await counter.online(true);

    expect(
      screen.getByRole("button", { name: "Take E12 and E11" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(OFFLINE_HERE)).toBeNull();

    await counter.online(false);

    expect(screen.queryByRole("button", { name: /^Take/ })).toBeNull();
  });

  it("withdraws the next best's take control too", async () => {
    const counter = await taken({ statuses: { E12: "X" } });

    await counter.online(false);

    expect(screen.queryByRole("button", { name: /^Take/ })).toBeNull();
    expect(screen.getByText(OFFLINE_HERE)).toBeOnTheScreen();
  });
});
