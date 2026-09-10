import { useSyncExternalStore } from "react";

const connectionChanges = (tick: () => void) => {
  window.addEventListener("online", tick);
  window.addEventListener("offline", tick);
  return () => {
    window.removeEventListener("online", tick);
    window.removeEventListener("offline", tick);
  };
};

const isOnline = () => navigator.onLine;

export const useOnline = (): boolean =>
  useSyncExternalStore(connectionChanges, isOnline);
