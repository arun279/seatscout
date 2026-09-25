import { useFonts } from "expo-font";
import { type NativeStackNavigationOptions, Stack } from "expo-router";
import type { ReactElement } from "react";
import { SHEET_PRESENTATION } from "../design-system/sheet.js";
import { FACES } from "../theme.js";

export const unstable_settings: { readonly anchor: string } = {
  anchor: "index",
};

const STAGE: NativeStackNavigationOptions = { headerShown: false };

const ASK: NativeStackNavigationOptions = {
  presentation: SHEET_PRESENTATION,
  sheetAllowedDetents: [1],
  sheetGrabberVisible: false,
};

const RESTING: NativeStackNavigationOptions = {
  presentation: "formSheet",
  sheetAllowedDetents: [0.5, 1],
  sheetGrabberVisible: true,
};

export default function Layout(): ReactElement | null {
  const [loaded, unreadable] = useFonts(FACES);

  if (!loaded && unreadable === null) return null;

  return (
    <Stack screenOptions={STAGE}>
      <Stack.Screen name="index" />
      <Stack.Screen name="room" />
      <Stack.Screen name="ask" options={ASK} />
      <Stack.Screen name="hand-off" options={RESTING} />
      <Stack.Screen name="ledger" options={RESTING} />
    </Stack>
  );
}
