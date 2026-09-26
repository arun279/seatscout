import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Range } from "./range.js";

const ranging = async (ends?: readonly [string, string]) => {
  const onChange = jest.fn<(value: number) => void>();
  await render(
    <Range
      ends={ends}
      label="How far back"
      onChange={onChange}
      said="67% of the way back"
      scale={{ min: 0, max: 1, step: 0.01 }}
      value={0.67}
    />,
  );
  return onChange;
};

const slider = () => screen.getByLabelText("How far back");

describe("a range a person slides along", () => {
  it("is the platform's slider, named, holding its value between its ends and at its step", async () => {
    await ranging();

    expect(slider().props).toMatchObject({
      accessibilityRole: "adjustable",
      value: 0.67,
      minimumValue: 0,
      maximumValue: 1,
      step: 0.01,
    });
  });

  it("says its value in words beside its name, and to a screen reader", async () => {
    await ranging();

    expect(screen.getByText("67% of the way back")).toBeOnTheScreen();
    expect(slider().props["aria-valuetext"]).toBe("67% of the way back");
  });

  it("hands out where it was slid to, in hundredths", async () => {
    const changed = await ranging();

    await fireEvent(slider(), "valueChange", 0.30000000000000004);

    expect(changed).toHaveBeenCalledWith(0.3);
  });

  it("names its two ends when it has them, and none when it does not", async () => {
    await ranging(["Front row", "Back row"]);

    expect(screen.getByText("Front row")).toBeOnTheScreen();
    expect(screen.getByText("Back row")).toBeOnTheScreen();
  });

  it("names no ends when it is given none", async () => {
    await ranging();

    expect(screen.queryByText("Front row")).toBeNull();
  });

  it("stands as tall as the touch floor", async () => {
    await ranging();

    expect(StyleSheet.flatten(slider().parent?.props["style"]).height).toBe(
      TOUCH_FLOOR,
    );
  });

  it("tells a screen reader where its thumb sits between its ends, in whole hundredths", async () => {
    await render(
      <Range
        label="Left or right"
        onChange={jest.fn()}
        said="a little left"
        scale={{ min: -1, max: 1, step: 0.01 }}
        value={-0.304}
      />,
    );

    expect(screen.getByLabelText("Left or right").props).toMatchObject({
      "aria-valuemin": -100,
      "aria-valuemax": 100,
      "aria-valuenow": -30,
      "aria-valuetext": "a little left",
    });
  });

  it("moves its thumb to zero when the value it holds becomes zero", async () => {
    const onChange = jest.fn();
    const props = {
      label: "Left or right",
      said: "",
      scale: { min: -1, max: 1, step: 0.01 },
      onChange,
    };
    const { rerender } = await render(<Range {...props} value={0.3} />);

    await rerender(<Range {...props} value={0} />);

    expect(screen.getByLabelText("Left or right").props["value"]).toBeCloseTo(
      0,
    );
  });

  it("draws its track and thumb in the house's colours", async () => {
    houseLights("down");
    await ranging();

    expect(slider().props).toMatchObject({
      minimumTrackTintColor: "#b3dff5",
      maximumTrackTintColor: "#202333",
      thumbTintColor: "#e6ecf2",
    });
  });
});
