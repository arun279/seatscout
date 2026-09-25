import { Platform } from "react-native";

export const isAndroid = (os: typeof Platform.OS): boolean => os === "android";

export const ON_ANDROID: boolean = isAndroid(Platform.OS);
