const { mixinJestEnvironment } = require("@stryker-mutator/jest-runner");
const { mark, value } = require("./environment-mark.cjs");

const {
  testEnvironment: environmentBothPresetsName,
} = require("jest-expo/ios/jest-preset");
const ReactNativeEnvironment = require(environmentBothPresetsName);

class MarkedReactNativeEnvironment extends ReactNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global[mark] = value;
  }
}

module.exports = mixinJestEnvironment(MarkedReactNativeEnvironment);
