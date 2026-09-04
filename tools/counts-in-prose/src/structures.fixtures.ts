export const reading =
  (source: string, named = "a.ts") =>
  (path: string) => {
    if (path !== named) throw new Error(`no such file: ${path}`);
    return source;
  };
