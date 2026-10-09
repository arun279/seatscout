import type { ReactElement } from "react";
import { Text, type TextProps } from "react-native";
import { type Palette, type Role, useTheme } from "../theme.js";
import { useTextSize } from "./text-size.js";

interface TypeProps extends TextProps {
  readonly set: Role;
  readonly tone: keyof Palette;
}

export const Type = ({
  set,
  tone,
  style,
  ...rest
}: TypeProps): ReactElement => {
  const theme = useTheme();
  const face = theme.type[set];
  const scale = useTextSize();

  return (
    <Text
      {...rest}
      key={scale}
      maxFontSizeMultiplier={face.cap}
      style={[
        {
          color: theme.colours[tone],
          fontFamily: face.family,
          fontSize: face.size,
          letterSpacing: face.size * face.tracking,
          lineHeight: face.size * face.leading,
          textTransform: face.transform,
        },
        style,
      ]}
    />
  );
};
