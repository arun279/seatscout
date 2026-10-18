import { useEffect } from "react";
import { StatusBar, type StatusBarStyle } from "react-native";
import type { Appearance } from "../theme.js";

const BARS: Readonly<Record<Appearance, StatusBarStyle>> = {
  down: "light-content",
  up: "dark-content",
};

export const useLitStatusBar = (appearance: Appearance): void => {
  useEffect(() => {
    StatusBar.setBarStyle(BARS[appearance]);
  }, [appearance]);
};
