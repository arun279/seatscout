import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Room } from "./auditorium.js";
import { opened } from "./auditorium.fixtures.js";
import {
  HOOKY_ADDISON,
  LAKE_HIGHLANDS_1,
  openedRooms,
  searched,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";

const room = () => within(screen.getByRole("dialog"));

const chips = () =>
  room()
    .getAllByRole("radio")
    .map((radio) => radio.closest("label")?.textContent);

const legend = () =>
  room()
    .getAllByRole("listitem")
    .map((entry) => entry.textContent);

describe("the Seat Groups a room offers, as one choice", () => {
  afterEach(cleanup);

  it("lists the recommendation and three alternates however many the room holds, and names the room's amenities beside what is not bookable", async () => {
    const stage = await opened(HOOKY_ADDISON);

    expect(chips()).toEqual([
      "G14·G13 Row 7 of 10 · on the centreline",
      "H14·H13 Row 8 of 10 · on the centreline",
      "F12·F11 Row 6 of 10 · on the centreline",
      "J14·J13 Row 9 of 10 · on the centreline",
    ]);
    expect(
      stage.room.getByText(
        "30 pairs in this room. Choose a Seat on the map for any of them.",
      ),
    ).toBeVisible();
    expect(stage.dialog.querySelector(".facts")).toHaveTextContent(
      "2 of 250 not bookableRecliners",
    );
  });

  it("appends a Seat Group chosen from outside the three, so the radios always tell the truth about the candidate", async () => {
    const stage = await opened(HOOKY_ADDISON);
    stage.press("PageUp");
    stage.press("Enter");

    expect(chips()).toEqual([
      "G14·G13 Row 7 of 10 · on the centreline",
      "H14·H13 Row 8 of 10 · on the centreline",
      "F12·F11 Row 6 of 10 · on the centreline",
      "J14·J13 Row 9 of 10 · on the centreline",
      "A16·A15 Row 1 of 10 · on the centreline · in the front rows",
    ]);
    expect(stage.room.getByRole("radio", { name: /^A16·A15/ })).toBeChecked();
  });

  it("names the console in a room whose pods are in only some of its rows", async () => {
    await opened(HOOKY_ADDISON);

    expect(legend()).toEqual([
      "G14·G13, yours",
      "for sale",
      "not bookable",
      "wheelchair or companion, kept out of ordinary results",
      "console",
    ]);
  });

  it("names both amenities of a room that has two", async () => {
    const alamo = await opened(LAKE_HIGHLANDS_1);

    expect(alamo.dialog.querySelector(".facts")).toHaveTextContent(
      "0 of 155 not bookableAccessibility Devices · Closed Captioning",
    );
  });

  it("leaves the console out of a room with no pods, and says nothing where a room has no amenity", async () => {
    const plain = await opened(WEST_PLANO_28);

    expect(legend()).toEqual([
      "H14·H13, yours",
      "for sale",
      "not bookable",
      "wheelchair or companion, kept out of ordinary results",
    ]);
    expect(plain.dialog.querySelectorAll(".facts span")).toHaveLength(1);
    expect(plain.dialog.querySelector(".facts")).toHaveTextContent(
      "279 of 304 not bookable",
    );
  });

  it("drops 'kept out of ordinary results' from the legend when the Query asked for accessible seating", async () => {
    const [asked] = await openedRooms(
      {
        movie: "245569",
        date: "2026-08-28",
        area: "75006",
        partySize: 2,
        accessibleSeating: true,
      },
      [LAKE_HIGHLANDS_1],
    );
    if (asked === undefined) throw new Error("the Alamo room offered nothing");
    render(
      <Room
        result={asked.result}
        search={asked.search}
        today="2026-08-28"
        now={1000}
        online={true}
        onClose={() => {}}
        onHandOff={() => {}}
      />,
    );

    expect(legend()[3]).toBe("wheelchair or companion");
  });

  it("opens no room that holds no Seat Group: every room the search read offered one, and only a room that offered one draws the card that opens it", async () => {
    const { search, settled } = await searched();

    expect(settled.results).toHaveLength(settled.coverage.checked);
    expect(
      settled.results.map((result) => search.auditorium(result).offered.length),
    ).not.toContain(0);
  });

  it("says the party's own word for a Seat Group of three, in the count line and in the refusal a Seat outside every offer gets", async () => {
    const [room] = await openedRooms(
      {
        movie: "245569",
        date: "2026-08-28",
        area: "75006",
        partySize: 3,
        accessibleSeating: false,
      },
      [WEST_PLANO_28],
    );
    if (room === undefined) throw new Error("the room offered nothing");
    render(
      <Room
        result={room.result}
        search={room.search}
        today="2026-08-28"
        now={1000}
        online={true}
        onClose={() => {}}
        onHandOff={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const refused = dialog.querySelector('[data-seat="G17"]');
    if (refused === null) throw new Error("G17 is not drawn");
    fireEvent.click(refused);

    expect(dialog.querySelector(".alternates .micro")).toHaveTextContent(
      "2 groups of three in this room. Choose a Seat on the map for any of them.",
    );
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "No offered group of three includes seat G17.",
    );
  });
});
