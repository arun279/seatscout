declare const SHELL_FILES: string[];

const CACHE = "shell";

export const isShellPath = (path: string) => SHELL_FILES.includes(path);

export const precacheShell = async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL_FILES);
};

export const cachedShell = (path: string) => caches.match(path);
