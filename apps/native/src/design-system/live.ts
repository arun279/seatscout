import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

export const useSpoken = (message: string | null): void => {
  useEffect(() => {
    if (message !== null) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
};
