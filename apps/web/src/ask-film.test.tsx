import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  asking,
  chip,
  film,
  find,
  NOTHING,
  opened,
  suggested,
  typed,
} from "./ask.fixtures.js";
import { ask, NEARBY, SCHEDULES, staged, TODAY } from "./search.fixtures.js";

describe("the Ask sheet's film field", () => {
  afterEach(cleanup);

  it("resolves a half-remembered title as typed, and a tap on a suggestion fills the film", async () => {
    const stage = await asking();
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
    const stage = await asking();
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

  it("offers no film until an area is named, says so, and reads nothing", () => {
    const stage = staged({ terms: NOTHING });
    fireEvent.click(screen.getByRole("button", { name: "Find seats" }));
    typed("co");

    expect(
      ask().getByText("Name an area to see what is playing."),
    ).toBeVisible();
    expect(suggested()).toEqual([]);
    expect(stage.requested(NEARBY)).toBe(0);
  });

  it("names the one Theater whose films could not be read in the singular", async () => {
    await opened({
      script: { sequences: { [`${SCHEDULES}aacbt`]: [500, 500, 500] } },
    });

    expect(
      ask().getByText(
        "Films at 1 theater could not be read: Cinemark Dallas XD and IMAX.",
      ),
    ).toBeVisible();
  });

  it("re-reads what is playing when the area it was read for changes, and not when it has not", async () => {
    const stage = await asking();
    const near = ask().getByLabelText("Near, by postal code");
    const reads = stage.programmesRead();

    fireEvent.blur(near);

    expect(stage.programmesRead()).toBe(reads);

    fireEvent.change(near, { target: { value: "75234" } });
    fireEvent.blur(near);
    await stage.programmed();

    expect(stage.programmesRead()).toBe(reads + 1);

    fireEvent.change(ask().getByLabelText("Date"), {
      target: { value: "2026-08-29" },
    });
    fireEvent.blur(near);
    await stage.programmed();

    expect(stage.programmesRead()).toBe(reads + 2);
  });

  it("asks for nothing, and does not stumble, when the area it is blurred with was never named", async () => {
    const stage = staged({ terms: NOTHING });
    fireEvent.click(screen.getByRole("button", { name: "Find seats" }));

    fireEvent.blur(ask().getByLabelText("Near, by postal code"));

    expect(stage.programmesRead()).toBe(0);
    expect(
      ask().getByText("Name an area to see what is playing."),
    ).toBeVisible();
  });

  it("reads nothing for an area of blank space, and takes it as no area at all", async () => {
    const stage = await asking();
    const near = ask().getByLabelText("Near, by postal code");
    const reads = stage.requested(NEARBY);

    fireEvent.change(near, { target: { value: "   " } });
    fireEvent.blur(near);
    await stage.programmed();

    expect(stage.requested(NEARBY)).toBe(reads);
    expect(
      ask().getByText("Name an area to see what is playing."),
    ).toBeVisible();
  });

  it("marks the letters that were typed, wherever the space around them fell", async () => {
    await asking();
    typed("  co  ");

    expect(
      [
        ...ask()
          .getByRole("list", { name: /playing near/i })
          .querySelectorAll("em"),
      ].map((marked) => marked.textContent),
    ).toEqual(["Co", "Co"]);
  });

  it("says nothing at all once every Theater has answered", async () => {
    await asking();

    expect(ask().queryByRole("status")).toBeNull();
  });

  it("leaves the window's two fields empty until a window is asked for", async () => {
    await asking();

    expect(ask().getByLabelText("From")).toHaveValue("");
    expect(ask().getByLabelText("Until")).toHaveValue("");
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
});
