import { describe, expect, it } from "@jest/globals";
import type { HouseLights } from "@seatscout/client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { houseLights } from "../../test/lights.js";
import { HouseLightsControl } from "./house-lights.js";

describe("the house lights control", () => {
  it("offers the system's setting, chosen, and says what it comes to right now", async () => {
    houseLights("down");
    await render(
      <HouseLightsControl chosen="system" onChosen={() => undefined} />,
    );

    expect(screen.getByText("House lights")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "System", selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByText("System · down right now")).toBeOnTheScreen();
  });

  it("says a held choice holds whatever the phone says", async () => {
    houseLights("down");
    await render(<HouseLightsControl chosen="up" onChosen={() => undefined} />);

    expect(
      screen.getByRole("button", { name: "Up", selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Always up")).toBeOnTheScreen();
  });

  it("asks for the lights a person presses", async () => {
    const asked: HouseLights[] = [];
    await render(
      <HouseLightsControl
        chosen="system"
        onChosen={(lights) => asked.push(lights)}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Down" }));

    expect(asked).toEqual(["down"]);
  });
});
