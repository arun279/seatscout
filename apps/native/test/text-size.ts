import { Dimensions } from "react-native";

const AT_START = {
  window: Dimensions.get("window"),
  screen: Dimensions.get("screen"),
};

export const scaledTo = (fontScale: number): void => {
  Dimensions.set({
    window: { ...Dimensions.get("window"), fontScale },
    screen: { ...Dimensions.get("screen"), fontScale },
  });
};

export const widenedBy = (width: number): void => {
  const window = Dimensions.get("window");
  Dimensions.set({
    window: { ...window, width: window.width + width },
    screen: Dimensions.get("screen"),
  });
};

export const sizedAsAtStart = (): void => {
  Dimensions.set(AT_START);
};
