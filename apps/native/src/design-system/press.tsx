import type { ReactElement } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";

export interface PressProps extends Omit<PressableProps, "style"> {
  readonly style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({ held: { opacity: 0.2 } });

export const Press = ({ style, ...rest }: PressProps): ReactElement => (
  <Pressable
    {...rest}
    style={({ pressed }) => [style, pressed && styles.held]}
  />
);
