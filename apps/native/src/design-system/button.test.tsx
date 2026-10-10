import { describe, expect, it, jest } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { impactAsync, notificationAsync, selectionAsync } from "expo-haptics";
import { Platform, StyleSheet } from "react-native";
import { contrastOf } from "../../test/contrast.js";
import { houseLights } from "../../test/lights.js";
import { definedUnder, drawnUnder, paintedWith } from "../../test/svg.js";
import { type Appearance, themeFor } from "../theme.js";
import { Ghost, Velvet } from "./button.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const drawn = async (
  appearance: Appearance = "down",
  onPress: () => void = () => undefined,
) => {
  houseLights(appearance);
  await render(<Velvet label="Find seats" onPress={onPress} />);
  return {
    control: StyleSheet.flatten(
      screen.getByRole("button", { name: "Find seats" }).props["style"],
    ),
    label: StyleSheet.flatten(screen.getByText("Find seats").props["style"]),
  };
};

describe("the velvet control", () => {
  it("is a button a person can find by the words on it", async () => {
    await drawn();

    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
  });

  it("does what it says when it is pressed", async () => {
    const pressed = jest.fn();
    await drawn("down", pressed);

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));

    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it("plays the medium impact a commit earns, and neither a selection tick nor a success, because the app hands off and never books", async () => {
    await drawn("down", jest.fn());

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));

    expect(jest.mocked(impactAsync).mock.calls).toEqual([["medium"]]);
    expect(notificationAsync).not.toHaveBeenCalled();
    expect(selectionAsync).not.toHaveBeenCalled();
  });

  for (const appearance of APPEARANCES)
    it(`carries its own label on it at the ratio the standard asks for, lights ${appearance}`, async () => {
      const { control, label } = await drawn(appearance);

      expect(
        contrastOf(String(control.backgroundColor), String(label.color)),
      ).toBeGreaterThanOrEqual(4.5);
    });

  it("hangs the curtain down it with the house lights down, and lights it from beneath", async () => {
    const { control } = await drawn("down");

    expect(screen.getByTestId("curtain")).toBeOnTheScreen();
    expect(String(control.boxShadow)).toContain("px");
  });

  it("hangs the curtain on a layer that covers the whole control, its padding included", async () => {
    await drawn("down");
    const layer = StyleSheet.flatten(
      screen.getByTestId("curtain", { includeHiddenElements: true }).props[
        "style"
      ],
    );

    expect(layer).toMatchObject({
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(layer.padding ?? layer.paddingHorizontal).toBeUndefined();
  });

  it("sizes the drawing to that layer, so neither the control's padding nor an unsized default can cut it short or spill it", async () => {
    await drawn("down");

    expect(
      within(
        screen.getByTestId("curtain", { includeHiddenElements: true }),
      ).getByTestId("curtain-drawing", { includeHiddenElements: true }).props,
    ).toMatchObject({ width: "100%", height: "100%" });
  });

  it("paints the curtain with the gradient it draws itself", async () => {
    await drawn("down");
    const [velvet] = definedUnder("curtain", "RNSVGLinearGradient");
    const [cloth] = drawnUnder("curtain", "RNSVGRect");

    expect(velvet).toEqual(expect.any(String));
    expect(cloth?.props["fill"]).toEqual(paintedWith(velvet));
  });

  it("leaves it flat with the house lights up, because a lit room reads by edge", async () => {
    const { control } = await drawn("up");

    expect(screen.queryByTestId("curtain")).toBeNull();
    expect(control.boxShadow).toBeUndefined();
  });

  it("draws an edge of its own rather than letting the fill end itself", async () => {
    const { control } = await drawn();

    expect(String(control.borderColor)).toMatch(/^#[0-9a-f]{6}$/);
    expect(control.borderColor).not.toBe(control.backgroundColor);
    expect(control.borderWidth).toBeGreaterThan(0);
  });

  it("takes the corner its own platform gives a commit", async () => {
    const { control } = await drawn();
    const half = Number(control.minHeight) / 2;

    expect(Number(control.borderRadius) >= half).toBe(
      Platform.OS === "android",
    );
  });
});

describe("the ghost control", () => {
  it.each(APPEARANCES)(
    "is drawn by its hairline edge on the platform's own corner, lights %s",
    async (appearance) => {
      houseLights(appearance);
      await render(
        <Ghost label="Widen the search" onPress={() => undefined} />,
      );
      const drawn = StyleSheet.flatten(
        screen.getByRole("button", { name: "Widen the search" }).props["style"],
      );

      expect(drawn.borderColor).toBe(themeFor(appearance).colours.hairline);
      expect(Number(drawn.borderRadius)).toBeGreaterThan(0);
    },
  );

  it("is not a control while it has nothing to do", async () => {
    await render(<Ghost label="Waiting" />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("waiting")).toHaveTextContent("Waiting");
  });
});
