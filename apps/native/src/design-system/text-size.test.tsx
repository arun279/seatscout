import { describe, expect, it } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { houseLights } from "../../test/lights.js";
import { Velvet } from "./button.js";
import { Field } from "./field.js";
import { FollowingTheTextSize } from "./text-size.js";
import { Type } from "./type.js";

const scaledTo = (fontScale: number) => {
  const window = Dimensions.get("window");
  Dimensions.set({
    window: { ...window, fontScale },
    screen: { ...Dimensions.get("screen"), fontScale },
  });
};

const drawn = async () => {
  await render(
    <FollowingTheTextSize>
      <Type set="sentence" tone="silver">
        Two seats together
      </Type>
      <Field
        focused={false}
        label="Near, by postal code"
        onTyped={() => undefined}
        value="75234"
      />
    </FollowingTheTextSize>,
  );
  return {
    words: screen.getByText("Two seats together"),
    field: screen.getByLabelText("Near, by postal code"),
  };
};

describe("text that follows the reader's text size while the app is open", () => {
  it("is drawn again, as new text and a new field, when the size changes", async () => {
    const before = await drawn();

    await act(() => scaledTo(3));

    expect(screen.getByText("Two seats together")).not.toBe(before.words);
    expect(screen.getByLabelText("Near, by postal code")).not.toBe(
      before.field,
    );
    await act(() => scaledTo(2));
  });

  it("keeps what it drew when the window changes and the text size does not", async () => {
    const before = await drawn();

    await act(() => {
      const window = Dimensions.get("window");
      Dimensions.set({
        window: { ...window, width: window.width + 1 },
        screen: Dimensions.get("screen"),
      });
    });

    expect(screen.getByText("Two seats together")).toBe(before.words);
    expect(screen.getByLabelText("Near, by postal code")).toBe(before.field);
  });

  it("draws the velvet curtain again at the size of the button its grown words make", async () => {
    houseLights("down");
    await render(
      <FollowingTheTextSize>
        <Velvet label="Find seats" onPress={() => undefined} />
      </FollowingTheTextSize>,
    );
    const before = screen.getByTestId("curtain", {
      includeHiddenElements: true,
    });

    await act(() => scaledTo(3));

    expect(
      screen.getByTestId("curtain", { includeHiddenElements: true }),
    ).not.toBe(before);
    await act(() => scaledTo(2));
  });
});
