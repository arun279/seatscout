import { afterEach, beforeAll, jest } from "@jest/globals";
import { cleanup, render } from "@testing-library/react-native/pure";
import { impactAsync, notificationAsync, selectionAsync } from "expo-haptics";
import { createElement } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appearanceOf, themeFor } from "../src/theme.js";
import { audit } from "./audit.js";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("react-native-reanimated", () =>
  jest.requireActual("react-native-reanimated/mock"),
);

const mockPicker = (props: Readonly<Record<string, unknown>>) =>
  createElement("RNDateTimePicker", props);

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: mockPicker,
}));

jest.mock("@expo/ui/community/menu", () => {
  const { View: Host } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const { createElement: drawn } =
    jest.requireActual<typeof import("react")>("react");
  return {
    MenuView: ({
      children,
      ...given
    }: {
      readonly children: import("react").ReactNode;
    }) => drawn(Host, given, children),
  };
});

const INITIALISATION = 30_000;
const AUDIT = 30_000;

beforeAll(async () => {
  await render(
    <SafeAreaView>
      <ScrollView>
        <TouchableOpacity>
          <Text>.</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>,
  );
  await cleanup();
}, INITIALISATION);

jest.mock("expo-haptics", () => ({
  ...jest.requireActual<object>("expo-haptics"),
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

afterEach(async () => {
  const { house } = themeFor(appearanceOf(useColorScheme())).colours;
  try {
    await audit(house);
  } finally {
    await cleanup();
    jest.mocked(selectionAsync).mockClear();
    jest.mocked(impactAsync).mockClear();
    jest.mocked(notificationAsync).mockClear();
  }
}, AUDIT);

const refuse = (...report: readonly unknown[]) => {
  throw new Error(report.map(String).join(" "));
};

console.error = refuse;
console.warn = refuse;
