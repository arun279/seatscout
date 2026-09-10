declare const SHELL_FILES: string[];

const CACHE = "shell";

export const isShellPath = (path: string): boolean => SHELL_FILES.includes(path);

export const precacheShell = async (): Promise<void> => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL_FILES);
};

export const cachedShell = (path: string): Promise<Response | undefined> =>
  caches.match(path);
