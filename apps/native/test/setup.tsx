import { beforeAll, jest } from "@jest/globals";
import { cleanup, render } from "@testing-library/react-native";
import { View } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const INITIALISATION = 30_000;

beforeAll(async () => {
  await render(<View />);
  await cleanup();
}, INITIALISATION);

const refuse = (...report: readonly unknown[]) => {
  throw new Error(report.map(String).join(" "));
};

console.error = refuse;
console.warn = refuse;
