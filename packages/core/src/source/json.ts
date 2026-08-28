export const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => value instanceof Object;

export const decoded = (body: string): { readonly value: unknown } | null => {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return null;
  }
};
