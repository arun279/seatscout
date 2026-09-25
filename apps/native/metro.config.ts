import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getDefaultConfig } from "expo/metro-config.js";

const EMITTED_JS = /^\.{1,2}\/.*\.jsx?$/;
const UPSTREAM = resolve(import.meta.dirname, "src/host/upstream.ts");
const CORPUS = resolve(import.meta.dirname, "e2e/upstream.ts");

const asked = process.env["SEATSCOUT_UPSTREAM"];
if (asked !== undefined && asked !== "corpus")
  throw new Error(
    `SEATSCOUT_UPSTREAM names no stand-in for the Source: ${asked}. Leave it unset for the Source itself, or set it to corpus.`,
  );

const config = getDefaultConfig(import.meta.dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const answered =
    !EMITTED_JS.test(moduleName) ||
    existsSync(resolve(dirname(context.originModulePath), moduleName));
  const resolution = context.resolveRequest(
    context,
    answered ? moduleName : moduleName.replace(/\.jsx?$/, ""),
    platform,
  );
  return asked !== undefined &&
    resolution.type === "sourceFile" &&
    resolution.filePath === UPSTREAM
    ? { type: "sourceFile", filePath: CORPUS }
    : resolution;
};

export default config;
