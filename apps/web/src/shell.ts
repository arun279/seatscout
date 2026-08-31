export const startShell = async () => {
  await navigator.serviceWorker.register("/sw.js", { type: "module" });
};
