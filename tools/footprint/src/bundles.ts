import { type Section, table } from "./markdown.js";

export interface Bundle {
  readonly name: string;
  readonly main: number;
  readonly change: number;
}

const LABEL = "bundle-grows";

const difference = ({ main, change }: Bundle) =>
  `${change > main ? "+" : ""}${change - main} B`;

const verdictOn = (grown: readonly Bundle[], accepted: boolean) => {
  const named = grown.map((bundle) => bundle.name).join(", ");
  if (grown.length === 0) return "No bundle is bigger than on main.";
  return accepted
    ? `Bigger than on main: ${named}. The \`${LABEL}\` label on this pull request accepts it.`
    : `Bigger than on main: ${named}. Make it smaller, or add the \`${LABEL}\` label to this pull request, where a reviewer sees it, and run this job again.`;
};

export const bundles = (
  weighed: readonly Bundle[],
  accepted: boolean,
): Section => {
  const grown = weighed.filter((bundle) => bundle.change > bundle.main);

  return {
    passed: grown.length === 0 || accepted,
    lines: [
      "### Bundle size",
      "",
      "Brotli, summed per file, over what each build publishes: the script Hermes",
      "compiles for each phone, with the workspace packages it reaches inlined, and",
      "the faces and images the app ships. Every emitted chunk counts, including one",
      "no screen has loaded, so this is what a build publishes rather than what one",
      "launch reads. Main is weighed as this change merges into it, in the same job.",
      "",
      ...table(
        ["Bundle", "Main", "This change", "Difference"],
        weighed.map((bundle) => [
          bundle.name,
          `${bundle.main} B`,
          `${bundle.change} B`,
          difference(bundle),
        ]),
      ),
      "",
      `A bundle may not grow without the \`${LABEL}\` label. ${verdictOn(grown, accepted)}`,
      "",
    ],
  };
};
