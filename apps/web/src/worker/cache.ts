const CACHE = "shell";

const SHELL = ["/", "/index.js", "/manifest.webmanifest"];

export const isShellPath = (path: string) => SHELL.includes(path);

export const precacheShell = async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
};

export const cachedShell = (path: string) => caches.match(path);
