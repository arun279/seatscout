import { type Section, table } from "./markdown.js";

export interface Bundle {
  readonly name: string;
  readonly main: number;
  readonly change: number;
}

export type Weighing =
  | {
      readonly kind: "weighed";
      readonly bundles: readonly Bundle[];
      readonly globsChanged: boolean;
    }
  | { readonly kind: "unweighed"; readonly reason: string };

const LABEL = "bundle-grows";

const HEADING = [
  "### Bundle size",
  "",
  "Brotli, summed per file, over what each build publishes: the script Hermes",
  "compiles for each phone, with the workspace packages it reaches inlined, and",
  "the faces and images the app ships. Every emitted chunk counts, including one",
  "no screen has loaded, so this is what a build publishes rather than what one",
  "launch reads. Main is weighed as this change merges into it, in the same job.",
  "",
];

const difference = ({ main, change }: Bundle) =>
  `${change > main ? "+" : ""}${change - main} B`;

interface Need {
  readonly cause: string;
  readonly remedy: string;
}

const verdictOn = (needs: readonly Need[], bundleGrows: boolean) => {
  if (needs.length === 0)
    return "No bundle is bigger than on main, and `.size-limit.json` is main's.";
  const named = `Needs the \`${LABEL}\` label: ${needs.map((need) => need.cause).join("; ")}.`;
  const remedies = [...new Set(needs.map((need) => need.remedy))].join(" and ");
  return bundleGrows
    ? `${named} The label on this pull request accepts it.`
    : `${named} ${remedies.charAt(0).toUpperCase()}${remedies.slice(1)}, or add the label to this pull request, where a reviewer sees it, and run the failed jobs again.`;
};

const weighedSection = (
  bundles: readonly Bundle[],
  globsChanged: boolean,
  bundleGrows: boolean,
): Section => {
  const needs: readonly Need[] = [
    ...bundles
      .filter((bundle) => bundle.change > bundle.main)
      .map((bundle) => ({
        cause: `${bundle.name} grew`,
        remedy: "make the bundle smaller",
      })),
    ...(globsChanged
      ? [
          {
            cause: "`.size-limit.json` differs from main's",
            remedy: "put `.size-limit.json` back as main's",
          },
        ]
      : []),
  ];
  return {
    passed: needs.length === 0 || bundleGrows,
    lines: [
      ...HEADING,
      ...table(
        ["Bundle", "Main", "This change", "Difference"],
        bundles.map((bundle) => [
          bundle.name,
          `${bundle.main} B`,
          `${bundle.change} B`,
          difference(bundle),
        ]),
      ),
      "",
      verdictOn(needs, bundleGrows),
      "",
    ],
  };
};

export const bundles = (weighing: Weighing, bundleGrows: boolean): Section =>
  weighing.kind === "weighed"
    ? weighedSection(weighing.bundles, weighing.globsChanged, bundleGrows)
    : {
        passed: false,
        lines: [
          ...HEADING,
          `The bundles were not weighed: ${weighing.reason}. With nothing to compare, the gate refuses the change.`,
          "",
        ],
      };
