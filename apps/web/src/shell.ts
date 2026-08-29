import { browserSession } from "./store.js";

export const startShell = async () => {
  const held = await browserSession().read();
  document
    .querySelector("#session")
    ?.replaceChildren(
      held === undefined
        ? "No upstream session is held on this device."
        : "An upstream session is held on this device.",
    );
  await navigator.serviceWorker.register("/sw.js", { type: "module" });
};
