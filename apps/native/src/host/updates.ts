import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  isEnabled,
  reloadAsync,
  useUpdates,
} from "expo-updates";
import { useEffect } from "react";
import { AppState } from "react-native";

const fetchNewer = async (): Promise<void> => {
  const { isAvailable } = await checkForUpdateAsync();
  if (isAvailable) await fetchUpdateAsync();
};

export const useLatestUpdate = (atRest: boolean): void => {
  const { isUpdatePending } = useUpdates();

  useEffect(() => {
    if (isUpdatePending && atRest) reloadAsync().catch(() => undefined);
  }, [isUpdatePending, atRest]);

  useEffect(() => {
    if (!isEnabled) return;
    const watching = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchNewer().catch(() => undefined);
    });
    return () => watching.remove();
  }, []);
};
