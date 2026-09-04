import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ask, NEARBY, SCHEDULES, staged, TODAY } from "./app.fixtures.js";
import { type Terms, termsFrom } from "./terms.js";

const NOTHING: Terms = { date: TODAY, partySize: 2 };
const EVERYTHING = termsFrom(
  "?movie=245569&date=2026-08-28&area=75006&partySize=2&chain=AMC&chain=Landmark&theater=aacbt&theater=aaxju&format=Dolby+Cinema&format=IMAX&amenity=Recliners&from=19:00&until=21:00&accessibleSeating=true",
  TODAY,
);

type Staged = Parameters<typeof staged>[0];

const opened = async (options: Staged = {}) => {
  const stage = staged(options);
  await stage.programmed();
  fireEvent.click(screen.getByRole("button", { name: /two seats together/i }));
  return stage;
};

const film = () => ask().getByLabelText("Film");

const typed = (text: string) =>
  fireEvent.change(film(), { target: { value: text } });

const suggested = () =>
  ask()
    .queryAllByRole("list", { name: /playing near/i })
    .flatMap((list) =>
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    );

const chip = (name: string) => ask().getByRole("button", { name });

const chipsIn = (group: string) =>
  within(ask().getByRole("group", { name: group })).getAllByRole("button");

const find = () =>
  fireEvent.click(ask().getByRole("button", { name: /find seats/i }));

describe("the Ask sheet", () => {
  afterEach(cleanup);

  it("resolves a half-remembered title as typed, and a tap on a suggestion fills the film", async () => {
    const stage = await opened();
    typed("co");

    expect(suggested()).toEqual(["Colony (2026)", "Coyote vs. Acme"]);

    fireEvent.click(chip("Coyote vs. Acme"));

    expect(film()).toHaveValue("Coyote vs. Acme");
    expect(suggested()).toEqual([]);

    find();

    expect(stage.chosen).toEqual([
      { movie: "246329", date: TODAY, area: "75006", partySize: 2 },
    ]);
  });

  it("runs a title typed exactly, whatever its case, as that film, and a film it cannot place as no film", async () => {
    const stage = await opened();
    typed("the dog stars (2026)");
    find();
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );
    typed("nothing playing anywhere");
    find();

    expect(stage.chosen).toEqual([
      { movie: "245569", date: TODAY, area: "75006", partySize: 2 },
      { date: TODAY, area: "75006", partySize: 2 },
    ]);
  });

  it("offers no film until an area is named, and says so", () => {
    staged({ terms: NOTHING });
    fireEvent.click(screen.getByRole("button", { name: "Find seats" }));
    typed("co");

    expect(
      ask().getByText("Name an area to see what is playing."),
    ).toBeVisible();
    expect(suggested()).toEqual([]);
  });

  it("says it is reading what is playing while the programme is on its way", async () => {
    const stage = staged();
    fireEvent.click(
      screen.getByRole("button", { name: /two seats together/i }),
    );

    expect(ask().getByText("Reading what is playing near 75006")).toBeVisible();

    await stage.programmed();

    expect(ask().queryByText(/reading what is playing/i)).toBeNull();
  });

  it("says when what is playing could not be read, and still takes a film's number", async () => {
    const stage = await opened({
      script: { sequences: { [NEARBY]: [500, 500, 500] } },
    });

    expect(
      ask().getByText("What is playing near 75006 could not be read."),
    ).toBeVisible();
    expect(film()).toHaveValue("245569");

    typed("243819");
    find();

    expect(stage.chosen).toEqual([
      { movie: "243819", date: TODAY, area: "75006", partySize: 2 },
    ]);
  });

  it("names the Theaters whose films could not be read", async () => {
    await opened({
      script: {
        sequences: {
          [`${SCHEDULES}aacbt`]: [500, 500, 500],
          [`${SCHEDULES}aaxju`]: [500, 500, 500],
        },
      },
    });

    expect(
      ask().getByText(
        "Films at 2 theaters could not be read: Cinemark Dallas XD and IMAX, AMC Village on the Parkway 9.",
      ),
    ).toBeVisible();
    expect(suggested()).toEqual([]);
    typed("co");
    expect(suggested()).toHaveLength(2);
  });

  it("offers every Format and Comfort the closed sets hold, every Chain, and the Theaters near the area by name", async () => {
    await opened();

    expect(chipsIn("Format")).toHaveLength(15);
    expect(chipsIn("Comfort")).toHaveLength(4);
    expect(chipsIn("Chain")).toHaveLength(9);
    expect(chipsIn("Theater")).toHaveLength(25);
    expect(chipsIn("Theater")[0]).toHaveTextContent(
      "Cinemark Dallas XD and IMAX",
    );
    for (const pressed of chipsIn("Format"))
      expect(pressed).toHaveAttribute("aria-pressed", "false");
  });

  it("composes every term in one search: format, comfort, chain, theater, a window and accessible seating", async () => {
    const stage = await opened();
    for (const name of [
      "IMAX",
      "Dolby Cinema",
      "Recliners",
      "Landmark",
      "AMC",
      "AMC Village on the Parkway 9",
      "Cinemark Dallas XD and IMAX",
    ])
      fireEvent.click(chip(name));
    fireEvent.change(ask().getByLabelText("From"), {
      target: { value: "19:00" },
    });
    fireEvent.change(ask().getByLabelText("Until"), {
      target: { value: "21:00" },
    });
    fireEvent.click(ask().getByLabelText("Accessible seating"));

    expect(chip("IMAX")).toHaveAttribute("aria-pressed", "true");
    expect(chip("3D")).toHaveAttribute("aria-pressed", "false");

    find();

    expect(stage.chosen).toEqual([EVERYTHING]);
  });

  it("shows every term it already holds when it opens, and lets one go", async () => {
    const stage = await opened({ terms: EVERYTHING });

    for (const name of [
      "IMAX",
      "Dolby Cinema",
      "Recliners",
      "AMC",
      "Landmark",
      "Cinemark Dallas XD and IMAX",
      "AMC Village on the Parkway 9",
    ])
      expect(chip(name)).toHaveAttribute("aria-pressed", "true");
    expect(ask().getByLabelText("From")).toHaveValue("19:00");
    expect(ask().getByLabelText("Until")).toHaveValue("21:00");
    expect(ask().getByLabelText("Accessible seating")).toBeChecked();

    fireEvent.click(chip("IMAX"));
    fireEvent.click(chip("AMC Village on the Parkway 9"));
    fireEvent.click(ask().getByLabelText("Accessible seating"));
    find();

    expect(stage.chosen).toEqual([
      {
        ...EVERYTHING,
        formats: ["Dolby Cinema"],
        theaters: ["aacbt"],
        accessibleSeating: undefined,
      },
    ]);
    expect(stage.chosen[0]).not.toHaveProperty("accessibleSeating");
  });

  it("explains accessible seating in the board's own words, and keeps the film list out of the way of a one-handed thumb", async () => {
    await opened();

    expect(
      ask().getByText(
        "Wheelchair and companion seats stay out of ordinary results. Turning this on searches for them deliberately.",
      ),
    ).toBeVisible();
    expect(ask().getByRole("button", { name: /find seats/i })).toBeVisible();
  });
});
