import { cachedShell, isShellPath, precacheShell } from "./cache.js";

declare const self: ServiceWorkerGlobalScope;

const isShellRequest = (request: Request) => {
  const { origin, pathname } = new URL(request.url);
  return (
    request.method === "GET" &&
    origin === self.location.origin &&
    isShellPath(pathname)
  );
};

const shellFor = async (request: Request) => {
  try {
    return await fetch(request);
  } catch {
    return (
      (await cachedShell(new URL(request.url).pathname)) ?? Response.error()
    );
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell());
});

self.addEventListener("fetch", (event) => {
  if (isShellRequest(event.request)) event.respondWith(shellFor(event.request));
});
