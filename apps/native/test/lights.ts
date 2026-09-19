import { jest } from "@jest/globals";
import { useColorScheme } from "react-native";
import type { Appearance } from "../src/theme.js";

const SCHEME: Readonly<Record<Appearance, "dark" | "light">> = {
  down: "dark",
  up: "light",
};

export const houseLights = (appearance: Appearance): void => {
  jest.mocked(useColorScheme).mockReturnValue(SCHEME[appearance]);
};
