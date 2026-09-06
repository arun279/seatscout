import { namedIn, type Used } from "./classes.ts";
import { beside, linked, ruledIn } from "./sheets.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export type Read = (path: string) => Promise<string>;
export type List = (pattern: string) => Promise<readonly string[]>;

export const HTML = "apps/web/public/index.html";
export const MODULES = "apps/web/src/**/*.tsx";

export const NOTHING =
  "Refusing a run over a pattern that matches no module. This check reads what a screen\nputs in a className, so a run over no module is a verdict over a tree nobody looked at.\n";

const refusal = (offenders: readonly Used[]): string =>
  `Refusing ${offenders.length} class(es) named in a className with no rule in any linked stylesheet:\n${offenders
    .map(({ file, line, name }) => `  ${file}:${line} .${name}`)
    .join(
      "\n",
    )}\n\nA class the markup carries and no stylesheet rules draws nothing, so the surface goes\nout unstyled where its board draws it. Add the rule to the stylesheet that owns the\nsurface, or take the class off the element. CONTRIBUTING.md says which owns what.\n`;

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
    linked(await read(html)).map(async (href) =>
      ruledIn(await read(beside(html, href))),
    ),
  );
  const ruled = new Set(sheets.flat());
  const used = await Promise.all(
    files.map(async (file) => namedIn(file, await read(file))),
  );

  const offenders = used.flat().filter(({ name }) => !ruled.has(name));
  if (offenders.length === 0) return 0;
  err.write(refusal(offenders));
  return 1;
};
