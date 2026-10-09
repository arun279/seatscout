const { mark, value } = require("./environment-mark.cjs");

if (globalThis[mark] !== value)
  throw new Error(
    "This test file is not running in the marked React Native environment jest.shared.js names.",
  );
