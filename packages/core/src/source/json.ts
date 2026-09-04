export type Kind = "boolean" | "number" | "string";

export const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => value instanceof Object;

export const carries = (
  value: unknown,
  fields: Readonly<Record<string, Kind>>,
): value is Readonly<Record<string, unknown>> =>
  isRecord(value) &&
  Object.entries(fields).every(([field, kind]) => typeof value[field] === kind);

export const decoded = (body: string): { readonly value: unknown } | null => {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return null;
  }
};
