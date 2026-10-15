import { describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import { fireEvent, screen, within } from "@testing-library/react-native";
import { asking, NEAR, PLAYING, submit, TODAY, WHOLE } from "../../test/ask.js";

const press = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name }));
};

const dock = () => within(screen.getByTestId("dock"));

describe("the area", () => {
  it("opens with the keyboard on the field", async () => {
    await asking({ focus: "area" });

    expect(screen.getByLabelText("Near, by postal code")).toHaveProp(
      "autoFocus",
      true,
    );
  });

  it("holds an empty area as an empty field", async () => {
    await asking({ focus: "area" });

    expect(screen.getByLabelText("Near, by postal code")).toHaveDisplayValue(
      "",
    );
  });

  it("says what the area decides", async () => {
    await asking({ focus: "area" });

    expect(
      screen.getByText(
        "The films and theaters you can pick are the ones playing near it.",
      ),
    ).toBeOnTheScreen();
  });

  it("hands out the area that was typed as the Query's own", async () => {
    const { found } = await asking({ focus: "area", terms: WHOLE });

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "  75006 ",
    );
    await submit();

    expect(found).toHaveBeenCalledWith({ ...WHOLE, area: "75006" }, REFERENCE);
  });

  it("reads the listing again for the area a person typed once they have finished typing it", async () => {
    const { seatscout } = await asking({ focus: "area", playing: PLAYING });
    const read = jest.spyOn(seatscout, "programme");
    const area = screen.getByLabelText("Near, by postal code");

    await fireEvent.changeText(area, "  75234  ");
    await fireEvent(area, "blur");

    expect(read).toHaveBeenCalledWith("75234", TODAY);
  });

  it("does not read the listing again when the area is left as it was", async () => {
    const { seatscout } = await asking({
      focus: "area",
      terms: NEAR,
      playing: PLAYING,
    });
    const read = jest.spyOn(seatscout, "programme");

    await fireEvent(screen.getByLabelText("Near, by postal code"), "blur");

    expect(read).not.toHaveBeenCalled();
  });
});

describe("the film", () => {
  it("opens with the keyboard on the field, naming the film the query carries", async () => {
    await asking({
      focus: "movie",
      terms: { ...NEAR, movie: "23184" },
      playing: PLAYING,
    });

    expect(await screen.findByLabelText("Film")).toHaveDisplayValue("Akira");
    expect(screen.getByLabelText("Film")).toHaveProp("autoFocus", true);
  });

  it("keeps the film the query carries, by its title, when what is playing cannot be read", async () => {
    const carried = { ...NEAR, movie: "245569", title: "The Dog Stars (2026)" };
    const { found } = await asking({ focus: "movie", terms: carried });

    expect(screen.getByLabelText("Film")).toHaveDisplayValue(
      "The Dog Stars (2026)",
    );
    await submit();

    expect(found).toHaveBeenCalledWith(carried, REFERENCE);
  });
});

describe("the seats", () => {
  it("hands out the party a person stepped to", async () => {
    const { found } = await asking({ focus: "partySize", terms: WHOLE });

    await press("More seats");
    await submit();

    expect(found).toHaveBeenCalledWith({ ...WHOLE, partySize: 3 }, REFERENCE);
  });
});

describe("the dock under every editor", () => {
  it("says what stays on the phone beside the one control that commits", async () => {
    await asking({ focus: "date", terms: NEAR });

    expect(dock().getAllByTestId("velvet")).toHaveLength(1);
    expect(
      dock().getByText(
        "Preferences and history stay on this phone. No account exists.",
      ),
    ).toBeOnTheScreen();
  });
});
