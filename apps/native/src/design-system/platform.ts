import { Platform } from "react-native";

export const isAndroid = (os: typeof Platform.OS): boolean => os === "android";

export const isWeb = (os: typeof Platform.OS): boolean => os === "web";

export const ON_ANDROID: boolean = isAndroid(Platform.OS);

export const ON_WEB: boolean = isWeb(Platform.OS);
