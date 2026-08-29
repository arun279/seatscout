import { cachedShell, isShellPath, precacheShell } from "./shell-cache.js";

declare const self: ServiceWorkerGlobalScope;

const shellFor = async (path: string) => {
  try {
    return await fetch(path);
  } catch {
    return (await cachedShell(path)) ?? Response.error();
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell());
});

self.addEventListener("fetch", (event) => {
  const { pathname } = new URL(event.request.url);
  if (isShellPath(pathname)) event.respondWith(shellFor(pathname));
});
