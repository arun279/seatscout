import { type Section, table, verdict } from "./markdown.js";

export interface Bundle {
  readonly name: string;
  readonly size: number;
  readonly sizeLimit: number;
  readonly passed: boolean;
}

const REMEDY =
  "Either make the bundle smaller, or raise the ratchet in this diff, where a reviewer sees it.";

export const bundles = (weighed: readonly Bundle[]): Section => {
  const withinRatchet = weighed.every((bundle) => bundle.passed);

  return {
    passed: withinRatchet,
    lines: [
      "### Bundle size",
      "",
      "Brotli, summed per file, over every script an application's own bundler",
      "emits, with the workspace packages it reaches inlined. Every emitted chunk",
      "counts, including one no page has loaded, so this is what a build publishes",
      "rather than what a page weighs.",
      "",
      ...table(
        ["Bundle", "Brotli", "Ratchet"],
        weighed.map((bundle) => [
          bundle.name,
          `${bundle.size} B`,
          `${bundle.sizeLimit} B`,
        ]),
      ),
      "",
      `Bundle size may not exceed the ratchet in \`.size-limit.json\`. ${verdict(withinRatchet, REMEDY)}`,
      "",
    ],
  };
};
