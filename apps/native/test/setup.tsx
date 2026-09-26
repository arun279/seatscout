import { afterEach, beforeAll, jest } from "@jest/globals";
import { cleanup, render } from "@testing-library/react-native/pure";
import { notificationAsync, selectionAsync } from "expo-haptics";
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

const mockPicker = (props: Readonly<Record<string, unknown>>) =>
  createElement("RNDateTimePicker", props);

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: mockPicker,
}));

const INITIALISATION = 30_000;

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
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

afterEach(async () => {
  const { house } = themeFor(appearanceOf(useColorScheme())).colours;
  try {
    await audit(house);
  } finally {
    await cleanup();
    jest.mocked(selectionAsync).mockClear();
    jest.mocked(notificationAsync).mockClear();
  }
});

const refuse = (...report: readonly unknown[]) => {
  throw new Error(report.map(String).join(" "));
};

console.error = refuse;
console.warn = refuse;
