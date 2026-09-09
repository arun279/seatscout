import { namedIn, type Used } from "./classes.ts";
import { bareIn, beside, linked, ruledIn } from "./sheets.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export type Read = (path: string) => Promise<string>;
export type List = (pattern: string) => Promise<readonly string[]>;

export const HTML = "apps/web/public/index.html";
const SHARED = "/house.css";
export const MODULES = "apps/web/src/**/*.tsx";

export const NOTHING =
  "Refusing a run over a pattern that matches no module. This check reads what a screen\nputs in a className, so a run over no module is a verdict over a tree nobody looked at.\n";

const refusal = (offenders: readonly Used[]): string =>
  `Refusing ${offenders.length} class(es) named in a className with no rule in any linked stylesheet:\n${offenders
    .map(({ file, line, name }) => `  ${file}:${line} .${name}`)
    .join(
      "\n",
    )}\n\nA class the markup carries and no stylesheet rules draws nothing, so the surface goes\nout unstyled where its board draws it. Add the rule to the stylesheet that owns the\nsurface, or take the class off the element. CONTRIBUTING.md says which owns what.\n`;

const shared = (
  sheets: readonly (readonly [string, string])[],
): readonly (readonly [string, readonly string[]])[] => {
  const surfaces = new Map<string, string[]>();
  for (const [href, css] of sheets) {
    if (href === SHARED) continue;
    for (const name of new Set(bareIn(css)))
      surfaces.set(name, [...(surfaces.get(name) ?? []), href]);
  }
  return [...surfaces].filter(([, where]) => where.length > 1);
};

const overlap = (
  offenders: readonly (readonly [string, readonly string[]])[],
): string =>
  `Refusing ${offenders.length} class(es) ruled on their own by more than one surface stylesheet:\n${offenders
    .map(([name, where]) => `  .${name} in ${where.join(" and ")}`)
    .join(
      "\n",
    )}\n\nOne class means one thing, and a bare rule in two surface sheets means whichever loads\nlast draws both. Name the surfaces' classes apart, or move the rule they share to\n${SHARED}, which is where what two or more surfaces draw belongs.\n`;

export const main = async (
  argv: readonly string[],
  read: Read,
  list: List,
  err: Writer,
): Promise<number> => {
  const [html = HTML, modules = MODULES] = argv.slice(2);
  const files = [...(await list(modules))].sort();
  if (files.length === 0) {
    err.write(NOTHING);
    return 1;
  }

  const sheets = await Promise.all(
    linked(await read(html)).map(
      async (href) => [href, await read(beside(html, href))] as const,
    ),
  );
  const ruled = new Set(sheets.flatMap(([, css]) => ruledIn(css)));
  const used = await Promise.all(
    files.map(async (file) => namedIn(file, await read(file))),
  );

  const unruled = used.flat().filter(({ name }) => !ruled.has(name));
  const twice = shared(sheets);
  if (unruled.length > 0) err.write(refusal(unruled));
  if (twice.length > 0) err.write(overlap(twice));
  return unruled.length + twice.length === 0 ? 0 : 1;
};
