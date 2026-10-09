const { mixinJestEnvironment } = require("@stryker-mutator/jest-runner");
const ReactNativeEnvironment = require(
  require("jest-expo/ios/jest-preset").testEnvironment,
);

class MarkedReactNativeEnvironment extends ReactNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__TEST_ENVIRONMENT__ = "react-native";
  }
}

module.exports = mixinJestEnvironment(MarkedReactNativeEnvironment);
