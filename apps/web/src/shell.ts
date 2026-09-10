export const startShell = async (): Promise<void> => {
  await navigator.serviceWorker.register("/sw.js", { type: "module" });
};
