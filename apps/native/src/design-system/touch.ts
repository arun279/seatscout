import { Platform } from "react-native";

export const floorFor = (os: typeof Platform.OS): number =>
  os === "ios" ? 44 : 48;

export const TOUCH_FLOOR: number = floorFor(Platform.OS);

type Slop = Readonly<Record<"top" | "bottom" | "left" | "right", number>>;

export const SLOP: Slop = { top: 15, bottom: 15, left: 6, right: 6 };

export const WIDE_SLOP: Slop = { top: 16, bottom: 16, left: 10, right: 10 };

export const SEATS_SLOP: Slop = { top: 16, bottom: 16, left: 5, right: 15 };
