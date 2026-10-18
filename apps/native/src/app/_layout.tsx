import { useFonts } from "expo-font";
import {
  type NativeStackNavigationOptions,
  Stack,
  useGlobalSearchParams,
  usePathname,
} from "expo-router";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SHEET_PRESENTATION } from "../design-system/sheet.js";
import { useLitStatusBar } from "../design-system/status-bar.js";
import { TextSizeProvider } from "../design-system/text-size.js";
import { atRestOn } from "../host/address.js";
import { useLights } from "../host/lights.js";
import { houseLights } from "../host/source.js";
import { useLatestUpdate } from "../host/updates.js";
import { ChosenLights, FACES, useThemeUnder } from "../theme.js";

export const unstable_settings: { readonly anchor: string } = {
  anchor: "index",
};

const styles = StyleSheet.create({ root: { flex: 1 } });

const STAGE: NativeStackNavigationOptions = { headerShown: false };

const ASK: NativeStackNavigationOptions = {
  presentation: SHEET_PRESENTATION,
  sheetAllowedDetents: [1],
  sheetGrabberVisible: false,
};

const FITTED: NativeStackNavigationOptions = {
  presentation: "formSheet",
  sheetAllowedDetents: "fitToContents",
  sheetGrabberVisible: true,
};

const RESTING: NativeStackNavigationOptions = {
  presentation: "formSheet",
  sheetAllowedDetents: [0.5, 1],
  sheetGrabberVisible: true,
};

export default function Layout(): ReactElement | null {
  const [loaded, unreadable] = useFonts(FACES);
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const lights = useLights(houseLights());
  const theme = useThemeUnder(lights ?? "system");
  useLitStatusBar(theme.appearance);
  useLatestUpdate(atRestOn(pathname, params));

  if ((!loaded && unreadable === null) || lights === undefined) return null;

  return (
    <ChosenLights value={lights}>
      <GestureHandlerRootView
        style={[styles.root, { backgroundColor: theme.colours.house }]}
        testID="house"
      >
        <TextSizeProvider>
          <Stack screenOptions={STAGE}>
            <Stack.Screen name="index" />
            <Stack.Screen name="room" />
            <Stack.Screen name="ask" options={ASK} />
            <Stack.Screen
              dangerouslySingular
              name="hand-off"
              options={FITTED}
            />
            <Stack.Screen dangerouslySingular name="ledger" options={RESTING} />
          </Stack>
        </TextSizeProvider>
      </GestureHandlerRootView>
    </ChosenLights>
  );
}
