const { mixinJestEnvironment } = require("@stryker-mutator/jest-runner");
const { mark, value } = require("./environment-mark.cjs");
const stopAtFirstFailure = require("./stop-at-first-failure.cjs");

const {
  testEnvironment: environmentBothPresetsName,
} = require("jest-expo/ios/jest-preset");
const ReactNativeEnvironment = require(environmentBothPresetsName);

class MarkedReactNativeEnvironment extends ReactNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global[mark] = value;
  }

  handleTestEvent(event) {
    stopAtFirstFailure(event, process.env.__STRYKER_ACTIVE_MUTANT__);
  }
}

module.exports = mixinJestEnvironment(MarkedReactNativeEnvironment);
