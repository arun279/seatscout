import { parseSync } from "oxc-parser";

export const SCRIPT: RegExp = /\.[cm]?[jt]sx?$/;

const blankBetween = (characters: string[], start: number, end: number) => {
  for (let at = start; at < end; at += 1)
    if (characters[at] !== "\n" && characters[at] !== "\r")
      characters[at] = "x";
};

const blankIn = (node: unknown, characters: string[]): void => {
  if (typeof node !== "object" || node === null) return;
  const type: unknown = Reflect.get(node, "type");
  const start = Number(Reflect.get(node, "start"));
  const end = Number(Reflect.get(node, "end"));
  if (type === "TemplateElement" || type === "JSXText")
    blankBetween(characters, start, end);
  else if (
    typeof Reflect.get(node, "value") === "string" ||
    Reflect.get(node, "regex") !== undefined
  )
    blankBetween(characters, start + 1, end - 1);
  for (const child of Object.values(node)) blankIn(child, characters);
};

export const blanked = (path: string, source: string): string => {
  const { program, errors } = parseSync(path, source);
  const [error] = errors;
  if (error !== undefined)
    throw new Error(`${path} does not parse: ${error.message}`);
  const characters = source.split("");
  blankIn(program, characters);
  return characters.join("");
};
