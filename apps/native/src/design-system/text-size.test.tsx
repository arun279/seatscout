import { afterEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { type ReactElement, useState } from "react";
import { houseLights } from "../../test/lights.js";
import { scaledTo, sizedAsAtStart, widenedBy } from "../../test/text-size.js";
import { Velvet } from "./button.js";
import { Field } from "./field.js";
import { TextSizeProvider } from "./text-size.js";
import { Type } from "./type.js";

const LABEL = "Near, by postal code";

const Asked = (): ReactElement => {
  const [typed, setTyped] = useState("");

  return (
    <TextSizeProvider>
      <Type set="sentence" tone="silver">
        Two seats together
      </Type>
      <Field focused label={LABEL} onTyped={setTyped} value={typed} />
    </TextSizeProvider>
  );
};

const drawn = async () => {
  await render(<Asked />);
  return {
    words: screen.getByText("Two seats together"),
    field: screen.getByLabelText(LABEL),
  };
};

afterEach(() => act(sizedAsAtStart));

describe("text that follows the reader's text size while the app is open", () => {
  it("draws its words again when the size changes", async () => {
    const before = await drawn();

    await act(() => scaledTo(3));

    expect(screen.getByText("Two seats together")).not.toBe(before.words);
  });

  it("keeps the same field, and what was typed in it, when the size changes", async () => {
    const before = await drawn();
    await fireEvent.changeText(before.field, "7500");

    await act(() => scaledTo(3));

    expect(screen.getByLabelText(LABEL)).toBe(before.field);
    expect(screen.getByLabelText(LABEL)).toHaveDisplayValue("7500");
  });

  it("keeps what it drew when the window changes and the text size does not", async () => {
    const before = await drawn();

    await act(() => widenedBy(1));

    expect(screen.getByText("Two seats together")).toBe(before.words);
  });

  it("draws the velvet curtain again at the size of the button its grown words make", async () => {
    houseLights("down");
    await render(
      <TextSizeProvider>
        <Velvet label="Find seats" onPress={() => undefined} />
      </TextSizeProvider>,
    );
    const before = screen.getByTestId("curtain", {
      includeHiddenElements: true,
    });

    await act(() => scaledTo(3));

    expect(
      screen.getByTestId("curtain", { includeHiddenElements: true }),
    ).not.toBe(before);
  });
});
