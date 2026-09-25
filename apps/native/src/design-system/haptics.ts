import { selectionAsync } from "expo-haptics";
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export const useSelectionTick = (): (() => void) => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const held = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return held.remove;
  }, []);

  return () => {
    if (!reduced) void selectionAsync();
  };
};
