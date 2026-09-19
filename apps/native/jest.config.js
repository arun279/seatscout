import { shared } from "./jest.shared.js";

export default {
  rootDir: ".",
  projects: [
    { ...shared, displayName: "ios", preset: "jest-expo/ios" },
    { ...shared, displayName: "android", preset: "jest-expo/android" },
  ],
};
