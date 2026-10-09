import { describe, expect, it, jest } from "@jest/globals";
import type { Term } from "@seatscout/view-logic";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { termMenuFor } from "./term-menu.js";

const CHOICES = [
  { value: 1, text: "One seat", chosen: false },
  { value: 2, text: "Two seats together", chosen: true },
];

const shown = async (os: "ios" | "android" | "web") => {
  const TermMenu = termMenuFor(os);
  const chose = jest.fn<(value: number) => void>();
  const asked = jest.fn<(term: Term) => void>();
  await render(
    <TermMenu
      choices={CHOICES}
      more="Another number"
      onChoose={chose}
      onMore={() => asked("partySize")}
      set="marqueeTitle"
      tone="silver"
      words="Two seats together"
    />,
  );
  return { chose, asked };
};

describe("a term changed in place", () => {
  it.each(["ios", "android"] as const)(
    "is the platform's own menu on %s",
    async (os) => {
      await shown(os);

      expect(
        screen.getByTestId("menu Two seats together").props["actions"],
      ).toHaveLength(3);
    },
  );

  it("does nothing for an item it does not hold", async () => {
    const { chose, asked } = await shown("ios");

    await fireEvent(
      screen.getByTestId("menu Two seats together"),
      "pressAction",
      { nativeEvent: { event: "9" } },
    );

    expect(chose).not.toHaveBeenCalled();
    expect(asked).not.toHaveBeenCalled();
  });

  it("opens Ask instead on the web, where no platform menu answers", async () => {
    const { asked } = await shown("web");

    expect(screen.queryByTestId("menu Two seats together")).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "Two seats together" }),
    );

    expect(asked).toHaveBeenCalledWith("partySize");
    expect(screen.getByTestId("menu-mark")).toBeOnTheScreen();
  });
});
