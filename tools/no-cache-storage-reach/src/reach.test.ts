import { describe, expect, it } from "vitest";
import { NAME, reaching, refusal, tracked, WRITER } from "./reach.ts";

const read = (files: Readonly<Record<string, string>>) => (path: string) => {
  const source = files[path];
  if (source === undefined) throw new Error(`no such file: ${path}`);
  return source;
};

describe("reaching Cache Storage", () => {
  it("keeps the file that names it and drops the one that does not", () => {
    const files = {
      "apps/web/src/a.ts": `const store = ${NAME};`,
      "apps/web/src/b.ts": "const store = localStorage;",
    };

    expect(reaching(Object.keys(files), read(files))).toStrictEqual([
      "apps/web/src/a.ts",
    ]);
  });

  it("reads the name through an escape", () => {
    const files = { "apps/web/src/a.ts": 'self["\\x63aches"]' };

    expect(reaching(Object.keys(files), read(files))).toStrictEqual([
      "apps/web/src/a.ts",
    ]);
  });

  it("lets the one writer name it", () => {
    const files = { [WRITER]: `const store = ${NAME};` };

    expect(reaching(Object.keys(files), read(files))).toStrictEqual([]);
  });

  it("lets a stub in the two worker tests name it, and nothing else there", () => {
    const files = {
      "apps/web/src/worker/cache.test.ts": 'vi.stubGlobal("caches", fake);',
      "apps/web/src/worker/sw.test.ts": 'vi.stubGlobal("caches", fake);',
      "apps/web/src/worker/other.test.ts": 'vi.stubGlobal("caches", fake);',
    };

    expect(reaching(Object.keys(files), read(files))).toStrictEqual([
      "apps/web/src/worker/other.test.ts",
    ]);
  });

  it("still refuses a worker test that names it outside the stub", () => {
    const files = {
      "apps/web/src/worker/cache.test.ts":
        'vi.stubGlobal("caches", fake);\nawait caches.open("v1");',
    };

    expect(reaching(Object.keys(files), read(files))).toStrictEqual([
      "apps/web/src/worker/cache.test.ts",
    ]);
  });

  it("reads a listing as its paths and drops the empty line at its end", () => {
    expect(tracked("apps/web/src/a.ts\napps/web/src/b.ts\n")).toStrictEqual([
      "apps/web/src/a.ts",
      "apps/web/src/b.ts",
    ]);
  });

  it("reads an empty listing as no path at all", () => {
    expect(tracked("")).toStrictEqual([]);
  });

  it("names every offender, the one writer, and why", () => {
    expect(refusal(["apps/web/src/a.ts"])).toBe(
      "Refusing 1 file(s) that name Cache Storage:\n" +
        "  apps/web/src/a.ts\n\n" +
        `Cache Storage is reached only through ${WRITER}, whose writer takes no\n` +
        "argument and caches the build's own output. Availability changes minute to minute,\n" +
        "so a cached seat is a lie with a plausible face. CONTRIBUTING.md says why.\n",
    );
  });
});
