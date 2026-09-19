import { useFonts } from "expo-font";
import { type NativeStackNavigationOptions, Stack } from "expo-router";
import type { ReactElement } from "react";
import { FACES } from "../theme.js";

const STAGE: NativeStackNavigationOptions = { headerShown: false };

const ASK: NativeStackNavigationOptions = {
  presentation: "formSheet",
  sheetAllowedDetents: [1],
  sheetGrabberVisible: false,
};

export default function Layout(): ReactElement | null {
  const [loaded, unreadable] = useFonts(FACES);

  if (!loaded && unreadable === null) return null;

  return (
    <Stack screenOptions={STAGE}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ask" options={ASK} />
    </Stack>
  );
}
