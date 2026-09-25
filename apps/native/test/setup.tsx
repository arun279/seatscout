import { beforeAll, jest } from "@jest/globals";
import { cleanup, render } from "@testing-library/react-native";
import { createElement, type ReactNode } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const mockHost = ({ children }: { readonly children: ReactNode }) => children;

const mockRangePicker = (props: Readonly<Record<string, unknown>>) =>
  createElement("DateRangePickerDialog", { ...props, testID: "range-picker" });

jest.mock("@expo/ui/jetpack-compose", () => ({
  Host: mockHost,
  DateRangePickerDialog: mockRangePicker,
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

const refuse = (...report: readonly unknown[]) => {
  throw new Error(report.map(String).join(" "));
};

console.error = refuse;
console.warn = refuse;
