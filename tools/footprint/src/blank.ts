import { parseSync } from "oxc-parser";

export const SCRIPT: RegExp = /\.[cm]?[jt]sx?$/;

interface Span {
  readonly start: number;
  readonly end: number;
}

const numberAt = (node: object, key: string): number => {
  const value: unknown = Reflect.get(node, key);
  return typeof value === "number" ? value : 0;
};

const spanOf = (node: object): readonly Span[] => {
  const type: unknown = Reflect.get(node, "type");
  const start = numberAt(node, "start");
  const end = numberAt(node, "end");
  if (type === "TemplateElement" || type === "JSXText") return [{ start, end }];
  if (type !== "Literal") return [];
  const written =
    typeof Reflect.get(node, "value") === "string" ||
    Reflect.get(node, "regex") !== undefined;
  return written ? [{ start: start + 1, end: end - 1 }] : [];
};

const literalsIn = (value: unknown): readonly Span[] => {
  if (Array.isArray(value)) return value.flatMap(literalsIn);
  if (typeof value !== "object" || value === null) return [];
  return [...spanOf(value), ...Object.values(value).flatMap(literalsIn)];
};

export const blanked = (path: string, source: string): string => {
  const { program, errors } = parseSync(path, source);
  const [error] = errors;
  if (error !== undefined)
    throw new Error(`${path} does not parse: ${error.message}`);
  const characters = source.split("");
  for (const { start, end } of literalsIn(program))
    for (let at = start; at < end; at += 1)
      if (characters[at] !== "\n" && characters[at] !== "\r")
        characters[at] = "x";
  return characters.join("");
};
