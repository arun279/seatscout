import { jest } from "@jest/globals";
import {
  type ColorSchemeName,
  Appearance as Overrides,
  useColorScheme,
} from "react-native";
import type { Appearance } from "../src/theme.js";

const SCHEME: Readonly<Record<Appearance, "dark" | "light">> = {
  down: "dark",
  up: "light",
};

export const houseLights = (appearance: Appearance): void => {
  jest.mocked(useColorScheme).mockReturnValue(SCHEME[appearance]);
};

export const phoneThatLagsAnOverride = (appearance: Appearance): void => {
  let reported: ColorSchemeName = SCHEME[appearance];
  jest.mocked(useColorScheme).mockImplementation(() => reported);
  jest.spyOn(Overrides, "setColorScheme").mockImplementation((asked) => {
    if (asked !== "unspecified") reported = asked;
  });
};
