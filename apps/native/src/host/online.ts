import { useNetworkState } from "expo-network";

export const useOnline = (): boolean => {
  const { isInternetReachable, isConnected } = useNetworkState();
  return isInternetReachable ?? isConnected ?? true;
};
