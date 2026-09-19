import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getDefaultConfig } from "expo/metro-config.js";

const EMITTED_JS = /^\.{1,2}\/.*\.jsx?$/;

const config = getDefaultConfig(import.meta.dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const answered =
    !EMITTED_JS.test(moduleName) ||
    existsSync(resolve(dirname(context.originModulePath), moduleName));
  return context.resolveRequest(
    context,
    answered ? moduleName : moduleName.replace(/\.jsx?$/, ""),
    platform,
  );
};

export default config;
