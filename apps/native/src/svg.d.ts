import "react-native-svg";

declare module "react-native-svg" {
  interface GProps {
    matrix?: number[];
  }

  interface RectProps {
    role?: "img";
  }
}
