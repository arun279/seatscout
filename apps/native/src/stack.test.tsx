import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { StyleSheet } from "react-native";
import Layout from "./app/_layout.js";
import Ask from "./app/ask.js";
import Index from "./app/index.js";

const mockLoading = jest.fn<() => [boolean, Error | null]>(() => [true, null]);

jest.mock("expo-font", () => ({ useFonts: () => mockLoading() }));

const opened = () =>
  renderRouter(
    { _layout: Layout, index: Index, ask: Ask },
    { initialUrl: "/" },
  );

describe("the stack the app opens on", () => {
  it("opens on the Search screen's prompt face", async () => {
    const app = opened();
    await app;

    expect(app.getPathname()).toBe("/");
    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
  });

  it("presents the Ask sheet over it when the velvet control is pressed", async () => {
    const app = opened();
    await app;

    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
    await screen.findByText("What are we seeing?");

    expect(app.getPathname()).toBe("/ask");
  });

  it("presents it when a title-card line is pressed too, at the term that line names", async () => {
    const app = opened();
    await app;

    await fireEvent.press(
      screen.getByRole("button", { name: "Two seats together" }),
    );
    await screen.findByText("What are we seeing?");

    expect(app.getPathname()).toBe("/ask");
    expect(app.getSearchParams()).toMatchObject({ term: "partySize" });
  });

  it("stands the sheet on the same ground the screen beneath it uses", async () => {
    const app = opened();
    await app;
    await fireEvent.press(screen.getByRole("button", { name: "Find seats" }));
    await screen.findByText("What are we seeing?");

    const sheet = StyleSheet.flatten(
      screen.getAllByTestId("stage").at(-1)?.props["style"],
    );

    expect(String(sheet.backgroundColor)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("the faces the app is set in", () => {
  afterEach(() => {
    mockLoading.mockReturnValue([true, null]);
  });

  it("holds the screen back until they have loaded", async () => {
    mockLoading.mockReturnValue([false, null]);

    await opened();

    expect(screen.queryByRole("button", { name: "Find seats" })).toBeNull();
  });

  it("draws it anyway when a face cannot be read, so the platform's own still reads", async () => {
    mockLoading.mockReturnValue([false, new Error("no face")]);

    await opened();

    expect(
      screen.getByRole("button", { name: "Find seats" }),
    ).toBeOnTheScreen();
  });
});
