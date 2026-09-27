const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const EMITTED_JS = /^\.{1,2}\/.*\.jsx?$/;
const WORKLETS = "react-native-worklets";
const EXPO = /node_modules\/expo(-modules-core)?\//;

const inNode = (options) => ({
  ...options,
  extensions: options.extensions?.filter((held) => !held.includes("native")),
});

const runsInNode = (request, basedir) =>
  !EXPO.test(basedir) &&
  (basedir.includes(WORKLETS) || request.includes(WORKLETS));

module.exports = (request, options) => {
  const answered =
    !EMITTED_JS.test(request) || existsSync(resolve(options.basedir, request));
  const reaching = runsInNode(request, options.basedir)
    ? inNode(options)
    : options;
  return reaching.defaultResolver(
    answered ? request : request.replace(/\.jsx?$/, ""),
    reaching,
  );
};
