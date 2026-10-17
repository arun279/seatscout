import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
import { Platform, StyleSheet } from "react-native";
import { houseLights } from "../../test/lights.js";
import { scaledTo, sizedAsAtStart } from "../../test/text-size.js";
import { Chips, Choices, Tags, TagStrip } from "./chips.js";
import { TextSizeProvider } from "./text-size.js";

const FORMATS = [
  { value: "IMAX", text: "IMAX" },
  { value: "Dolby Cinema", text: "Dolby Cinema" },
  { value: "3D", text: "3D" },
] as const;

type Format = (typeof FORMATS)[number]["value"];

const chipping = async (chosen?: readonly Format[]) => {
  const onChosen = jest.fn<(chosen: readonly Format[]) => void>();
  await render(<Chips chips={FORMATS} chosen={chosen} onChosen={onChosen} />);
  return onChosen;
};

const chip = (name: string) => screen.getByRole("button", { name });

describe("a group of chips, any number of them chosen", () => {
  it("offers every chip in the group", async () => {
    await chipping();

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("says which chips are chosen", async () => {
    await chipping(["3D"]);

    expect(chip("3D")).toBeSelected();
    expect(chip("IMAX")).not.toBeSelected();
  });

  it("adds a chip pressed to what was chosen, in the order the group lists them", async () => {
    const chosen = await chipping(["3D"]);

    await fireEvent.press(chip("IMAX"));

    expect(chosen).toHaveBeenCalledWith(["IMAX", "3D"]);
  });

  it("takes a chosen chip out when it is pressed again", async () => {
    const chosen = await chipping(["3D", "IMAX"]);

    await fireEvent.press(chip("3D"));

    expect(chosen).toHaveBeenCalledWith(["IMAX"]);
  });

  it("plays one selection tick for the chip pressed", async () => {
    await chipping(["3D"]);

    await fireEvent.press(chip("IMAX"));

    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("fills a chosen chip with the chosen ink and leaves the rest raised on an edge that reads", async () => {
    houseLights("down");
    await chipping(["IMAX"]);
    const style = (name: string) =>
      StyleSheet.flatten(chip(name).props["style"]);

    expect(style("IMAX").backgroundColor).toBe("#e6ecf2");
    expect(
      StyleSheet.flatten(screen.getByText("IMAX").props["style"]).color,
    ).toBe("#06070e");
    expect(
      StyleSheet.flatten(screen.getByText("3D").props["style"]).color,
    ).toBe("#e6ecf2");
    expect(style("3D")).toMatchObject({
      backgroundColor: "#161926",
      borderColor: "#a0a8b5",
    });
  });

  it("takes the corner and the mark its own platform gives a filter chip", async () => {
    await chipping(["IMAX"]);

    expect(StyleSheet.flatten(chip("IMAX").props["style"]).borderRadius).toBe(
      Platform.OS === "android" ? 8 : 12,
    );
    expect(screen.queryByText("✓") !== null).toBe(Platform.OS === "android");
  });
});

const GROUPS = [
  { key: "f", text: "F6·F7", sub: "Row 6 · on the centreline", value: 6 },
  {
    key: "g",
    text: "G8·G9",
    sub: "Row 7 · three seats right of centre",
    value: 7,
  },
] as const;

const choosing = async (
  onChoose: (value: number) => void = () => undefined,
  chosen = "f",
) => {
  await render(
    <Choices choices={GROUPS} chosen={chosen} onChoose={onChoose} />,
  );
};

describe("a group of chips, exactly one of them chosen", () => {
  it("offers each as a radio named by its words and its sub-line", async () => {
    await choosing();

    expect(
      screen
        .getAllByRole("radio")
        .map((one) => one.props["accessibilityLabel"]),
    ).toEqual([
      "F6·F7, Row 6 · on the centreline",
      "G8·G9, Row 7 · three seats right of centre",
    ]);
  });

  it("checks the chosen one alone", async () => {
    await choosing(undefined, "g");

    expect(screen.getByRole("radio", { name: /^G8·G9/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^F6·F7/ })).not.toBeChecked();
  });

  it("hands back the value of the one pressed, with one selection tick", async () => {
    const onChoose = jest.fn<(value: number) => void>();
    await choosing(onChoose);

    await fireEvent.press(screen.getByRole("radio", { name: /^G8·G9/ }));

    expect(onChoose).toHaveBeenCalledWith(7);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("inks the sub-line as the chip it sits in is inked", async () => {
    houseLights("down");
    await choosing();
    const ink = (text: string) =>
      StyleSheet.flatten(screen.getByText(text).props["style"]).color;

    expect(ink("Row 6 · on the centreline")).toBe("#06070e");
    expect(ink("Row 7 · three seats right of centre")).toBe("#aab2bd");
  });
});

const TWO = [
  { text: "Today", onPress: () => undefined },
  { text: "Any time", onPress: () => undefined },
];

const outlineOf = (words: string) =>
  StyleSheet.flatten(screen.getByText(words).parent?.props["style"]);

describe("a row of tags, each opening something rather than choosing it", () => {
  it("draws each tag's words in the ledger voice, inside a faint outline", async () => {
    houseLights("down");
    await render(<Tags tags={TWO} />);

    expect(
      StyleSheet.flatten(screen.getByText("Today").props["style"]),
    ).toMatchObject({ color: "#e6ecf2", fontFamily: "SplineSansMono-Regular" });
    expect(outlineOf("Today").borderColor).toBe("#a0a8b5");
  });

  it("names its row with a lead that is read but not pressed", async () => {
    await render(<Tags lead="When" tags={TWO} />);

    expect(screen.getByText("When")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "When" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("draws nothing but its tags when it has no lead", async () => {
    await render(<Tags tags={TWO} />);

    expect(chip("Today").parent?.children).toHaveLength(2);
  });

  it("says which tag was pressed, with one selection tick", async () => {
    const opened = jest.fn();
    await render(
      <Tags
        tags={[
          { text: "Today", onPress: () => opened("Today") },
          { text: "Any time", onPress: () => opened("Any time") },
        ]}
      />,
    );

    await fireEvent.press(chip("Any time"));

    expect(opened.mock.calls).toEqual([["Any time"]]);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });
});

describe("a strip of tags", () => {
  afterEach(() => act(sizedAsAtStart));

  const strip = () =>
    render(
      <TextSizeProvider>
        <TagStrip inset={18} tags={TWO} />
      </TextSizeProvider>,
    );

  it("scrolls sideways from the card's edge to the screen's at the standard text sizes", async () => {
    await act(() => scaledTo(1.353));
    await strip();
    const scroller = screen.getByTestId("tag-strip");

    expect(StyleSheet.flatten(scroller.props["style"])).toEqual({
      marginHorizontal: -18,
    });
    expect(
      StyleSheet.flatten(scroller.props["contentContainerStyle"]),
    ).toMatchObject({ flexDirection: "row", paddingHorizontal: 18 });
    expect(scroller.props["showsHorizontalScrollIndicator"]).toBe(false);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("draws nothing but its tags when it has no lead", async () => {
    await render(<Tags tags={TWO} />);

    expect(chip("Today").parent?.children).toHaveLength(2);
  });

  it("wraps instead at the accessibility text sizes, so no tag is out of reach", async () => {
    await act(() => scaledTo(1.786));
    await strip();

    expect(screen.queryByTestId("tag-strip")).toBeNull();
    expect(
      StyleSheet.flatten(chip("Today").parent?.props["style"]),
    ).toMatchObject({ flexDirection: "row", flexWrap: "wrap" });
  });
});
