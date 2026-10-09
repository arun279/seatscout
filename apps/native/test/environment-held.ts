if (Reflect.get(globalThis, "__TEST_ENVIRONMENT__") !== "react-native")
  throw new Error(
    "This test file is not running in the React Native environment the preset names.",
  );
