const ESCAPE =
  /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\(?:\r\n|[\n\r\u2028\u2029])|\\(.)/g;

const HIGHEST = 0x10ffff;

const decoded = (
  match: string,
  braced: string | undefined,
  plain: string | undefined,
  hex: string | undefined,
  literal: string | undefined,
): string => {
  const digits = [braced, plain, hex].find((group) => group !== undefined);
  if (digits === undefined) return literal === undefined ? "" : literal;
  const point = Number.parseInt(digits, 16);
  return point > HIGHEST ? match : String.fromCodePoint(point);
};

export const spelled = (source: string): string =>
  source.replace(ESCAPE, decoded);
