import { describe, expect, it, jest } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import {
  AccessibilityInfo,
  DeviceEventEmitter,
  LayoutAnimation,
  Platform,
  StyleSheet,
} from "react-native";
import { contrastOf } from "../../test/contrast.js";
import { everyControlReachesTheTouchFloor } from "../../test/floors.js";
import { houseLights } from "../../test/lights.js";
import type { Appearance } from "../theme.js";
import { presentationFor, Sheet } from "./sheet.js";
import { Type } from "./type.js";

const APPEARANCES: readonly Appearance[] = ["down", "up"];

const KEYBOARD = {
  duration: 250,
  easing: "keyboard",
  isEventFromThisApp: true,
  startCoordinates: { height: 0, screenX: 0, screenY: 874, width: 402 },
  endCoordinates: { height: 328, screenX: 0, screenY: 546, width: 402 },
};

const keyboard = async (
  event: "keyboardWillShow" | "keyboardWillHide",
  duration = KEYBOARD.duration,
) => {
  await act(() => {
    DeviceEventEmitter.emit(event, { ...KEYBOARD, duration });
  });
};

const stagePadding = () =>
  StyleSheet.flatten(screen.getByTestId("stage").props["style"]).paddingBottom;

const presented = async (
  appearance: Appearance = "down",
  onKeep: () => void = () => undefined,
  claimed = false,
) => {
  houseLights(appearance);
  await render(
    <Sheet
      claimed={claimed}
      dock={
        <Type set="sentenceStrong" tone="silver">
          Find seats
        </Type>
      }
      heading="What are we seeing?"
      keep="Keep as it was"
      onKeep={onKeep}
    >
      <Type set="sentence" tone="silver">
        Near, by postal code
      </Type>
    </Sheet>,
  );
  return {
    head: StyleSheet.flatten(screen.getByTestId("sheet-head").props["style"]),
    stage: StyleSheet.flatten(screen.getByTestId("stage").props["style"]),
    dock: StyleSheet.flatten(screen.getByTestId("dock").props["style"]),
  };
};

describe("a sheet the platform presents", () => {
  it("is a form sheet on iOS, which Apple asks for a sheet that does not resize", () => {
    expect(presentationFor("ios")).toBe("formSheet");
  });

  it("is a full-screen modal on Android, because Material caps a bottom sheet at half the screen", () => {
    expect(presentationFor("android")).toBe("fullScreenModal");
  });

  it("carries what it was asked to say and what it was asked to hold", async () => {
    await presented();

    expect(screen.getByText("What are we seeing?")).toBeOnTheScreen();
    expect(screen.getByText("Near, by postal code")).toBeOnTheScreen();
    expect(screen.getByText("Find seats")).toBeOnTheScreen();
  });

  it("leaves the way back on the leading edge, and takes it when it is pressed", async () => {
    const kept = jest.fn();
    await presented("down", kept);

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep as it was" }),
    );

    expect(kept).toHaveBeenCalledTimes(1);
  });

  it("closes with the platform's own mark: a cross in an app bar on Android, the words on iOS", async () => {
    await presented();

    expect(screen.queryByText("✕") !== null).toBe(Platform.OS === "android");
    expect(screen.queryByText("‹ Keep as it was") !== null).toBe(
      Platform.OS === "ios",
    );
  });

  it("wears the platform's own chrome above it only where the platform draws one", async () => {
    const { head } = await presented();

    expect(head?.backgroundColor !== undefined).toBe(Platform.OS === "android");
  });

  it("says its heading to a screen reader when no field inside it has taken the keyboard", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    said.mockClear();

    await presented();

    expect(said).toHaveBeenCalledWith("What are we seeing?");
  });

  it("says its heading again when it comes to say another one", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await presented();
    said.mockClear();

    await screen.rerender(
      <Sheet
        claimed={false}
        dock={null}
        heading="Where are we sitting?"
        keep="Keep as it was"
        onKeep={() => undefined}
      >
        {null}
      </Sheet>,
    );

    expect(said).toHaveBeenCalledWith("Where are we sitting?");
  });

  it("says nothing over the field a person was sent to, when one claimed the keyboard", async () => {
    const said = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    said.mockClear();

    await presented("down", () => undefined, true);

    expect(said).not.toHaveBeenCalled();
  });

  it("names its heading a heading, so a screen reader can move by them", async () => {
    await presented();

    expect(
      screen.getByRole("header", { name: "What are we seeing?" }),
    ).toBeOnTheScreen();
  });

  it("stands on the same ground the screen beneath it uses", async () => {
    const { stage, dock } = await presented();

    expect(String(stage.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
    expect(dock.backgroundColor).toBe(stage.backgroundColor);
  });

  it("rules the dock off from the scroll above it", async () => {
    const { dock } = await presented();

    expect(Number(dock.borderTopWidth)).toBeGreaterThan(0);
    expect(String(dock.borderTopColor)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("leaves the home indicator clear beneath what a thumb presses", async () => {
    await presented();

    expect(screen.getByTestId("dock")).toHaveProp(
      "edges",
      expect.objectContaining({ bottom: "additive" }),
    );
  });

  it("clears the status bar above it only where the sheet draws its own chrome", async () => {
    await presented();

    const head = screen.getByTestId("sheet-head").props["edges"];

    expect(String(head?.top)).toBe(
      Platform.OS === "android" ? "additive" : "undefined",
    );
  });

  it("lifts the dock by the keyboard's whole height on iOS, although the form sheet starts below the top of the window", async () => {
    await presented();
    await fireEvent(screen.getByTestId("stage"), "layout", {
      nativeEvent: { layout: { height: 812, width: 402, x: 0, y: 0 } },
      persist: () => undefined,
    });

    await keyboard("keyboardWillShow");

    expect(stagePadding()).toBe(Platform.OS === "ios" ? 328 : 0);
  });

  it("lets the dock back down when the keyboard goes", async () => {
    await presented();
    await keyboard("keyboardWillShow");

    await keyboard("keyboardWillHide");

    expect(stagePadding()).toBe(0);
  });

  it("moves the dock with the keyboard's own timing and curve on iOS", async () => {
    const animated = jest.spyOn(LayoutAnimation, "configureNext");
    animated.mockClear();
    await presented();

    await keyboard("keyboardWillShow");

    expect(animated.mock.calls).toEqual(
      Platform.OS === "ios"
        ? [[{ duration: 250, update: { duration: 250, type: "keyboard" } }]]
        : [],
    );
  });

  it("moves the dock at once when the keyboard arrives without a motion, as a hardware keyboard's bar does", async () => {
    const animated = jest.spyOn(LayoutAnimation, "configureNext");
    animated.mockClear();
    await presented();

    await keyboard("keyboardWillShow", 0);

    expect(animated).not.toHaveBeenCalled();
    expect(stagePadding()).toBe(Platform.OS === "ios" ? 328 : 0);
  });

  it("stops following the keyboard once it is gone", async () => {
    const before = DeviceEventEmitter.listenerCount("keyboardWillShow");
    await presented();

    await screen.unmount();

    expect(DeviceEventEmitter.listenerCount("keyboardWillShow")).toBe(before);
  });

  it("holds its scroll in a view the native sheet cannot flatten, so the form sheet cannot stretch the scroll over the head", async () => {
    await presented();

    const body = screen.getByTestId("sheet-body");

    expect(body).toHaveProp("collapsable", false);
    expect(within(body).getByText("Near, by postal code")).toBeOnTheScreen();
  });

  it("reaches the platform's touch floor with every control it draws", async () => {
    await presented();

    everyControlReachesTheTouchFloor();
  });

  for (const appearance of APPEARANCES)
    it(`reads its own heading against the ground behind it, lights ${appearance}`, async () => {
      const { head, stage } = await presented(appearance);
      const behind = String(head?.backgroundColor ?? stage.backgroundColor);
      const title = StyleSheet.flatten(
        screen.getByText("What are we seeing?").props["style"],
      );

      expect(contrastOf(behind, String(title.color))).toBeGreaterThanOrEqual(3);
    });
});
