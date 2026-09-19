const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const EMITTED_JS = /^\.{1,2}\/.*\.jsx?$/;

module.exports = (request, options) => {
  const answered =
    !EMITTED_JS.test(request) || existsSync(resolve(options.basedir, request));
  return options.defaultResolver(
    answered ? request : request.replace(/\.jsx?$/, ""),
    options,
  );
};
