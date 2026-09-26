import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
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

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const idOf = (path: string) => {
  let hash = FNV_OFFSET;
  for (const unit of relative(import.meta.dirname, path)) {
    hash ^= unit.charCodeAt(0);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 1;
};

config.serializer.createModuleIdFactory = () => {
  const held = new Map<number, string>();
  return (path: string) => {
    const id = idOf(path);
    const other = held.get(id);
    if (other !== undefined && other !== path)
      throw new Error(`Two modules hash to the id ${id}: ${other} and ${path}`);
    held.set(id, path);
    return id;
  };
};

export default config;
