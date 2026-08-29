export type Read = (path: string) => string;

export const bodyOf = (
  read: Read,
  path: string,
  declaration: string,
  pattern: RegExp,
): string => {
  const body = pattern.exec(read(path))?.[1];
  if (body === undefined) throw new Error(`${path} declares no ${declaration}`);
  return body;
};

export const fieldsOf = (
  read: Read,
  path: string,
  name: string,
): readonly string[] => {
  const body = bodyOf(
    read,
    path,
    `interface ${name}`,
    new RegExp(`\\binterface ${name} \\{\\n([\\s\\S]*?)\\n\\}`),
  );
  const fields = [...body.matchAll(/(?<=^ {2}(?:readonly )?)[\w$]+(?=\??:)/gm)];
  const members = [...body.matchAll(/^ {2}(?![)\]}])\S/gm)];
  if (fields.length !== members.length)
    throw new Error(
      `interface ${name} in ${path} declares a member spelled in a way this check cannot read`,
    );
  return fields.map((field) => field[0]);
};

const literalsIn = (body: string): readonly string[] =>
  [...body.matchAll(/"[^"]*"|[\w$]+/g)].map((literal) => literal[0]);

export const alternativesOf = (
  read: Read,
  path: string,
  name: string,
): readonly string[] => {
  const body = bodyOf(
    read,
    path,
    `type ${name}`,
    new RegExp(`\\btype ${name} =([\\s\\S]*?);`),
  );
  if (/[{<]/.test(body))
    throw new Error(
      `type ${name} in ${path} is no longer a union of literals this check can count`,
    );
  return literalsIn(body);
};

export const fieldAlternativesOf = (
  read: Read,
  path: string,
  name: string,
  field: string,
): readonly string[] =>
  [
    ...bodyOf(
      read,
      path,
      `the ${field} of an ${name}`,
      new RegExp(
        `\\binterface ${name} \\{\\n {2}readonly ${field}:([\\s\\S]*?);\\n`,
      ),
    ).matchAll(/"[^"]*"/g),
  ].map((alternative) => alternative[0]);

export const translationsOf = (
  read: Read,
  path: string,
  name: string,
): readonly string[] => {
  const body = bodyOf(
    read,
    path,
    `const ${name}`,
    new RegExp(
      `\\bconst ${name}:[^=]*= new Map\\(\\[\\n([\\s\\S]*?)\\n\\]\\);`,
    ),
  );
  const entries = [...body.matchAll(/^ {2}\["[^"]*", "[^"]*"\],$/gm)];
  const members = [...body.matchAll(/^ {2}\S/gm)];
  if (entries.length !== members.length)
    throw new Error(
      `const ${name} in ${path} holds an entry spelled in a way this check cannot read`,
    );
  return entries.map((entry) => entry[0]);
};

export const weightsOf = (
  read: Read,
  path: string,
  name: string,
): readonly number[] =>
  [
    ...bodyOf(
      read,
      path,
      `const ${name}`,
      new RegExp(`\\bconst ${name}: \\w+ = \\{\\n([\\s\\S]*?)\\n\\};`),
    ).matchAll(/(?<=^ {2}\w+Weight: )[^,]+(?=,$)/gm),
  ].map((charge) => {
    const weight = Number(charge[0]);
    if (Number.isNaN(weight))
      throw new Error(`${name} in ${path} weights something by "${charge[0]}"`);
    return weight;
  });

export const succeedingArmsOf = (read: Read, path: string): number =>
  [...read(path).matchAll(/^ {6}readonly ok: true;$/gm)].length;

export const deniedGlobalsOf = (
  read: Read,
  path: string,
  tree: string,
): readonly string[] => {
  const banning = JSON.parse(read(path)).overrides.find(
    (override: {
      includes?: string[];
      linter?: { rules?: { style?: { noRestrictedGlobals?: unknown } } };
    }) =>
      override.includes?.some((named) => named.startsWith(`${tree}/`)) &&
      override.linter?.rules?.style?.noRestrictedGlobals,
  );
  if (banning === undefined)
    throw new Error(`${path} denies no global under ${tree}`);
  return Object.keys(
    banning.linter.rules.style.noRestrictedGlobals.options.deniedGlobals,
  );
};
