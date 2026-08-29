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
  return [...body.matchAll(/"[^"]*"|[\w$]+/g)].map(
    (alternative) => alternative[0],
  );
};

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
