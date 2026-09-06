export interface Used {
  readonly file: string;
  readonly line: number;
  readonly name: string;
}

const ATTRIBUTE = /className=/g;
const LITERAL = /"[^"]*"|'[^']*'|`[^`]*`/g;
const QUOTED = /"[^"]*"|'[^']*'/g;
const HOLE = /\$\{[^}]*\}/g;
const SPACE = /\s/;
const BRACE = /[{}]/g;

const namesIn = (text: string): readonly string[] =>
  text.split(SPACE).filter((name) => name !== "");

const quotedIn = (text: string): readonly string[] =>
  [...text.matchAll(QUOTED)].flatMap(([quoted]) =>
    namesIn(quoted.slice(1, -1)),
  );

const literalsIn = (expression: string): readonly string[] =>
  [...expression.matchAll(LITERAL)].flatMap(([literal]) => {
    const written = literal.slice(1, -1);
    return [...namesIn(written.replace(HOLE, " ")), ...quotedIn(written)];
  });

export const closing = (source: string, open: number): number => {
  let depth = 0;
  for (const brace of source.slice(open).matchAll(BRACE)) {
    if (brace[0] === "{") {
      depth += 1;
      continue;
    }
    depth -= 1;
    if (depth === 0) return open + brace.index;
  }
  throw new Error("a className opens an expression that is never closed");
};

export const lineOf = (source: string, index: number): number =>
  source.slice(0, index).split("\n").length;

const namesAt = (
  source: string,
  at: number,
  where: string,
): readonly string[] => {
  if (source[at] === "{")
    return literalsIn(source.slice(at, closing(source, at)));
  if (source[at] === '"')
    return namesIn(source.slice(at + 1, source.indexOf('"', at + 1)));
  throw new Error(`${where} spells a className this check cannot read`);
};

export const namedIn = (file: string, source: string): readonly Used[] =>
  [...source.matchAll(ATTRIBUTE)].flatMap((attribute) => {
    const line = lineOf(source, attribute.index);
    const at = attribute.index + attribute[0].length;
    return namesAt(source, at, `${file}:${line}`).map((name) => ({
      file,
      line,
      name,
    }));
  });
