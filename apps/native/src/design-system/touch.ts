import { Platform } from "react-native";

export const floorFor = (os: typeof Platform.OS): number =>
  os === "ios" ? 44 : 48;

export const TOUCH_FLOOR: number = floorFor(Platform.OS);

export const SLOP: Readonly<
  Record<"top" | "bottom" | "left" | "right", number>
> = { top: 15, bottom: 15, left: 6, right: 6 };
