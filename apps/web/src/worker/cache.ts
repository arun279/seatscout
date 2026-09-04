const CACHE = "shell";

const SHELL = [
  "/",
  "/index.js",
  "/manifest.webmanifest",
  "/house.css",
  "/app.css",
  "/query.css",
  "/ask.css",
  "/results.css",
  "/coverage.css",
  "/auditorium.css",
  "/seat-map.css",
  "/icon.svg",
  "/fonts/big-shoulders-display.woff2",
  "/fonts/schibsted-grotesk.woff2",
  "/fonts/spline-sans-mono.woff2",
];

export const isShellPath = (path: string) => SHELL.includes(path);

export const precacheShell = async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
};

export const cachedShell = (path: string) => caches.match(path);
