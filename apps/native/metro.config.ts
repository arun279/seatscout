import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getDefaultConfig } from "expo/metro-config.js";

const EMITTED_JS = /^\.{1,2}\/.*\.jsx?$/;
const UPSTREAM = resolve(import.meta.dirname, "src/host/upstream.ts");
const ANSWERED_BY: Readonly<Record<string, string>> = {
  corpus: resolve(import.meta.dirname, "e2e/upstream.ts"),
};

const asked = process.env["SEATSCOUT_UPSTREAM"];
const substitute = asked === undefined ? undefined : ANSWERED_BY[asked];
if (asked !== undefined && substitute === undefined)
  throw new Error(
    `SEATSCOUT_UPSTREAM names no stand-in for the Source: ${asked}. Leave it unset for the Source itself, or name one of ${Object.keys(ANSWERED_BY).join(", ")}.`,
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
  return substitute !== undefined &&
    resolution.type === "sourceFile" &&
    resolution.filePath === UPSTREAM
    ? { type: "sourceFile", filePath: substitute }
    : resolution;
};

export default config;
