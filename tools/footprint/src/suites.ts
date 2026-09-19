import { type Section, table } from "./markdown.js";

export interface Suites {
  readonly unit: number;
  readonly screens: number;
  readonly endToEnd: number;
}

interface Spec {
  readonly tests: readonly unknown[];
}

interface Collected {
  readonly specs: readonly Spec[];
  readonly suites?: readonly Collected[];
}

const REMEDY =
  "Either put the tests back, or lower the ratchet in this diff, where a reviewer sees it.";

const counted = (collected: readonly Collected[]): number =>
  collected.reduce(
    (total, suite) =>
      total +
      suite.specs.reduce((specs, spec) => specs + spec.tests.length, 0) +
      counted(suite.suites ?? []),
    0,
  );

const some = (total: number, runner: string): number => {
  if (!(total > 0))
    throw new Error(
      `${runner} collected no test at all, so there is no count to hold to a ratchet. A suite that runs nothing passes everything.`,
    );
  return total;
};

export const suitesFrom = (
  unit: string,
  screens: string,
  endToEnd: string,
): Suites => ({
  unit: some(JSON.parse(unit).length, "Vitest"),
  screens: some(JSON.parse(screens).numTotalTests, "Jest"),
  endToEnd: some(counted(JSON.parse(endToEnd).suites), "Playwright"),
});

export const suites = (collected: Suites, ratchet: number): Section => {
  const total = collected.unit + collected.screens + collected.endToEnd;
  const withinRatchet = total >= ratchet;

  return {
    passed: withinRatchet,
    lines: [
      "### Tests",
      "",
      "Collected rather than run, by each runner's own listing, so the figure is what the",
      "suites hold rather than what one run happened to reach. Jest is the exception: it has no",
      "listing that counts tests without running them, so its figure is the run's own total.",
      "",
      ...table(
        ["Suite", "Tests"],
        [
          ["Unit, by Vitest", String(collected.unit)],
          ["Screens, by Jest", String(collected.screens)],
          ["End to end, by Playwright", String(collected.endToEnd)],
          ["Total", String(total)],
        ],
      ),
      "",
      `The total may not fall below the ratchet in \`.footprint.json\`, which is ${ratchet}. ${
        withinRatchet ? "At or above it." : `Below it. ${REMEDY}`
      }`,
      "",
      "A count is a weak gate on its own. It notices a suite shrinking and says nothing about",
      "whether what is left asserts anything, so it is met by a test that cannot fail. The",
      "mutation score below is what closes that, because a test that cannot fail leaves a",
      "mutant alive.",
      "",
    ],
  };
};
