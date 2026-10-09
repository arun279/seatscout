import { fileURLToPath } from "node:url";

const environment = fileURLToPath(
  new URL("test/environment.cjs", import.meta.url),
);

const shared = {
  resolver: "<rootDir>/test/resolver.cjs",
  testEnvironment: environment,
  setupFiles: ["@testing-library/react-native/dont-cleanup-after-each"],
  setupFilesAfterEnv: [
    "<rootDir>/test/environment-held.ts",
    "<rootDir>/test/setup.tsx",
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|decode-uri-component))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};

export const platform = (name) => ({
  ...shared,
  displayName: name,
  preset: `jest-expo/${name}`,
});

export const on = (...platforms) => ({
  rootDir: ".",
  testEnvironment: environment,
  projects: platforms.map(platform),
});
