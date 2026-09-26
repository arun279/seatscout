import { describe, expect, it } from "@jest/globals";
import { cleanup, render } from "@testing-library/react-native";
import { selectionAsync } from "expo-haptics";
import type { ReactElement } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { audit } from "./audit.js";

const HOUSE = "#000000";
const REACHING = { minHeight: 48, minWidth: 48 };

const audited = async (planted: ReactElement) => {
  await render(<View style={{ backgroundColor: HOUSE }}>{planted}</View>);
  try {
    await audit(HOUSE);
    return "";
  } catch (refusal) {
    return String(refusal);
  } finally {
    await cleanup();
  }
};

describe("the accessibility audit every rendered screen passes through", () => {
  it("passes a named button at the touch floor whose words read on their ground", async () => {
    expect(
      await audited(
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => undefined}
          style={REACHING}
        >
          <Text style={{ color: "#ffffff" }}>Go</Text>
        </TouchableOpacity>,
      ),
    ).toBe("");
  });

  it("refuses words under 4.5 to 1 against the ground they sit on, naming them and the criterion", async () => {
    expect(
      await audited(<Text style={{ color: "#555555" }}>dim words</Text>),
    ).toContain(
      'WCAG 2.2 1.4.3 Contrast (Minimum): \\"dim words\\" reads 2.82 to 1 against #000000, under 4.5',
    );
  });

  it("holds large words to 3 to 1, at 18 or at 14 in bold", async () => {
    expect(
      await audited(
        <Text style={{ color: "#666666", fontSize: 18 }}>large</Text>,
      ),
    ).toBe("");
    expect(
      await audited(
        <Text style={{ color: "#666666", fontSize: 14, fontWeight: "bold" }}>
          bold
        </Text>,
      ),
    ).toBe("");
    expect(
      await audited(
        <Text style={{ color: "#666666", fontSize: 17 }}>not large</Text>,
      ),
    ).toContain("1.4.3");
  });

  it("reads words against the nearest ground drawn behind them, and their colour from the words they sit in", async () => {
    expect(
      await audited(
        <View style={{ backgroundColor: "#ffffff" }}>
          <Text style={{ color: "#ffffff" }}>
            outer <Text>inner</Text>
          </Text>
        </View>,
      ),
    ).toContain('\\"outer inner\\" reads 1.00 to 1 against #ffffff');
  });

  it("refuses a colour it cannot weigh rather than passing it", async () => {
    expect(
      await audited(<Text style={{ color: "rgba(0,0,0,0.5)" }}>faint</Text>),
    ).toContain("which is not a colour this audit can weigh");
  });

  it("refuses a chosen button that does not stand 3 to 1 apart from its ground", async () => {
    expect(
      await audited(
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: true }}
          onPress={selectionAsync}
          style={{ ...REACHING, backgroundColor: "#111111" }}
        >
          <Text style={{ color: "#ffffff" }}>IMAX</Text>
        </TouchableOpacity>,
      ),
    ).toContain(
      'WCAG 2.2 1.4.11 Non-text Contrast: \\"IMAX\\" chosen reads 1.11 to 1 against #000000, under 3',
    );
  });

  it("refuses something that can be pressed and has no role", async () => {
    expect(
      await audited(
        <Pressable onPress={() => undefined} style={REACHING}>
          <Text style={{ color: "#ffffff" }}>Go</Text>
        </Pressable>,
      ),
    ).toContain(
      'WCAG 2.2 4.1.2 Name, Role, Value: \\"Go\\" can be pressed and has no role',
    );
  });

  it("refuses a control with no name a screen reader can say", async () => {
    expect(
      await audited(
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => undefined}
          style={REACHING}
        />,
      ),
    ).toContain(
      "WCAG 2.2 4.1.2 Name, Role, Value: a button with no accessible name",
    );
  });

  it("refuses a control that reaches less than the platform's floor, and counts its slop toward it", async () => {
    const small = (slop?: number) => (
      <TouchableOpacity
        accessibilityLabel="Close"
        accessibilityRole="button"
        hitSlop={slop}
        onPress={() => undefined}
        style={{ minHeight: 24, minWidth: 24 }}
      />
    );

    expect(await audited(small())).toContain(
      "WCAG 2.2 2.5.8 Target Size (Minimum), at the platform's floor",
    );
    expect(await audited(small(12))).toBe("");
  });

  it("lets pressable words in a sentence be as small as the sentence, as 2.5.8 excepts inline targets", async () => {
    expect(
      await audited(
        <Text
          accessibilityRole="link"
          onPress={() => undefined}
          style={{ color: "#ffffff" }}
        >
          read more
        </Text>,
      ),
    ).toBe("");
  });

  it("refuses a text field with no label", async () => {
    expect(await audited(<TextInput />)).toContain(
      "WCAG 2.2 3.3.2 Labels or Instructions: a text field with no label",
    );
  });

  it("refuses words that will not grow with the reader's text size", async () => {
    expect(
      await audited(
        <Text allowFontScaling={false} style={{ color: "#ffffff" }}>
          fixed
        </Text>,
      ),
    ).toContain(
      'WCAG 2.2 1.4.4 Resize Text: \\"fixed\\" refuses the reader\'s text size',
    );
  });

  it("presses every control that changes what is chosen, and refuses one that plays no feedback", async () => {
    const chip = (onPress: () => void) => (
      <TouchableOpacity
        accessibilityLabel="3D"
        accessibilityRole="button"
        accessibilityState={{ selected: false }}
        onPress={onPress}
        style={{ ...REACHING, borderColor: "#ffffff", borderWidth: 1 }}
      />
    );

    expect(await audited(chip(() => undefined))).toContain(
      'Apple HIG, Playing haptics: \\"3D\\" changes what is chosen or commits and plays no selection or notification feedback',
    );
    expect(await audited(chip(() => void selectionAsync()))).toBe("");
  });

  it("presses the commit, the velvet control, and refuses it when it plays no feedback", async () => {
    expect(
      await audited(
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => undefined}
          style={REACHING}
          testID="velvet"
        >
          <Text style={{ color: "#ffffff" }}>Find seats</Text>
        </TouchableOpacity>,
      ),
    ).toContain('\\"Find seats\\" changes what is chosen or commits');
  });
});
