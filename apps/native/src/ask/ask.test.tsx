import { describe, expect, it, jest } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import { fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { asking, NEAR, PLAYING, submit, TODAY } from "../../test/ask.js";

describe("the Ask sheet", () => {
  it("asks what a person is seeing, under the terms it already holds", async () => {
    await asking({ terms: { ...NEAR, partySize: 37 } });

    expect(screen.getByText("What are we seeing?")).toBeOnTheScreen();
    expect(screen.getByLabelText("Near, by postal code")).toHaveDisplayValue(
      "75234",
    );
    expect(
      screen.getByRole("button", { name: "Today, Saturday 19 September" }),
    ).toBeSelected();
    expect(screen.getByText("37")).toBeOnTheScreen();
  });

  it("names the film the query already carries by its title", async () => {
    await asking({ terms: { ...NEAR, movie: "23184" }, playing: PLAYING });

    expect(await screen.findByLabelText("Film")).toHaveDisplayValue("Akira");
  });

  it("keeps everything as it was when the way back is pressed", async () => {
    const kept = jest.fn();
    await asking({ onKeep: kept, terms: NEAR });

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep as it was" }),
    );

    expect(kept).toHaveBeenCalledTimes(1);
  });

  it("reads what is playing near the area the query already names", async () => {
    await asking({ terms: NEAR, playing: PLAYING });

    expect(
      await screen.findByRole("button", { name: "Coyote vs. Acme" }),
    ).toBeOnTheScreen();
  });

  it("hands out the area that was typed as the Query's own", async () => {
    const { found } = await asking();

    await fireEvent.changeText(
      screen.getByLabelText("Near, by postal code"),
      "75006",
    );
    await submit();

    expect(found).toHaveBeenCalledWith(
      {
        area: "75006",
        date: TODAY,
        partySize: 2,
      },
      REFERENCE,
    );
  });

  it("hands out the film a person picked from the listing, by the identity a listing is asked by", async () => {
    const { found } = await asking({ terms: NEAR, playing: PLAYING });

    await fireEvent.press(await screen.findByRole("button", { name: "Akira" }));
    await submit();

    expect(found).toHaveBeenCalledWith(
      {
        movie: "23184",
        area: "75234",
        date: TODAY,
        partySize: 2,
      },
      REFERENCE,
    );
  });

  it("hands out the party a person stepped to", async () => {
    const { found } = await asking({ terms: NEAR });

    await fireEvent.press(screen.getByRole("button", { name: "More seats" }));
    await submit();

    expect(found).toHaveBeenCalledWith({ ...NEAR, partySize: 3 }, REFERENCE);
  });

  it("hands out the date a person picked", async () => {
    const { found } = await asking({ terms: NEAR });

    await fireEvent.press(
      screen.getByRole("button", { name: "Saturday 26 September" }),
    );
    await submit();

    expect(found).toHaveBeenCalledWith(
      { ...NEAR, date: "2026-09-26" },
      REFERENCE,
    );
  });

  it("reads the listing again for the area a person typed once they have finished typing it", async () => {
    await asking({ playing: PLAYING });
    const area = screen.getByLabelText("Near, by postal code");

    await fireEvent.changeText(area, "75234");
    await fireEvent(area, "blur");

    expect(
      await screen.findByRole("button", { name: "Akira" }),
    ).toBeOnTheScreen();
  });

  it("opens with the keyboard on the film when that is the term it was asked to open at", async () => {
    await asking({ focus: "movie", terms: NEAR });

    expect(screen.getByLabelText("Film")).toHaveProp("autoFocus", true);
    expect(screen.getByLabelText("Near, by postal code")).toHaveProp(
      "autoFocus",
      false,
    );
  });

  it("opens with the keyboard on the area when that is the term instead", async () => {
    await asking({ focus: "area" });

    expect(screen.getByLabelText("Near, by postal code")).toHaveProp(
      "autoFocus",
      true,
    );
    expect(screen.getByLabelText("Film")).toHaveProp("autoFocus", false);
  });

  it("opens with no keyboard at all when the term it was opened at has no field", async () => {
    await asking({ focus: "partySize" });

    expect(screen.getByLabelText("Near, by postal code")).toHaveProp(
      "autoFocus",
      false,
    );
    expect(screen.getByLabelText("Film")).toHaveProp("autoFocus", false);
  });

  for (const focus of ["movie", "area"] as const)
    it(`leaves the heading unsaid when the ${focus} field takes the keyboard`, async () => {
      const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
      said.mockClear();

      await asking({ focus, terms: NEAR });

      expect(said).not.toHaveBeenCalled();
    });

  it("says its heading when the term it was opened at has no field to take the keyboard", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    said.mockClear();

    await asking({ focus: "partySize" });

    expect(said).toHaveBeenCalledWith("What are we seeing?");
  });

  it("does not read the listing again when the area is left as it was", async () => {
    const { seatscout } = await asking({ terms: NEAR, playing: PLAYING });
    await screen.findByRole("button", { name: "Akira" });
    const read = jest.spyOn(seatscout, "programme");

    await fireEvent(screen.getByLabelText("Near, by postal code"), "blur");

    expect(read).not.toHaveBeenCalled();
  });

  it("holds an empty area as an empty field, and asks for one", async () => {
    await asking();

    expect(screen.getByLabelText("Near, by postal code")).toHaveDisplayValue(
      "",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Name an area to see what is playing.",
    );
  });

  it("reads the listing for an area typed with space around it", async () => {
    await asking({ playing: PLAYING });
    const area = screen.getByLabelText("Near, by postal code");

    await fireEvent.changeText(area, "  75234  ");
    await fireEvent(area, "blur");

    expect(
      await screen.findByRole("button", { name: "Akira" }),
    ).toBeOnTheScreen();
  });

  it("reads the listing again for the date a person picked, because a listing is dated", async () => {
    await asking({ terms: NEAR, playing: PLAYING });
    await screen.findByRole("button", { name: "Akira" });

    await fireEvent.press(
      screen.getByRole("button", { name: "Saturday 26 September" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "What is playing near 75234 could not be read.",
    );
  });

  it("says what stays on the phone beside the one control that commits", async () => {
    await asking();

    expect(screen.getAllByTestId("velvet")).toHaveLength(1);
    expect(
      screen.getByText(
        "Preferences and history stay on this phone. No account exists.",
      ),
    ).toBeOnTheScreen();
  });
});
