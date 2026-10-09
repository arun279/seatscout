import type { Choice } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import {
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { type Palette, type Role, type Theme, useTheme } from "../theme.js";
import { ON_ANDROID } from "./platform.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface TokenFaceProps {
  readonly words: string;
  readonly set: Role;
  readonly tone: keyof Palette;
  readonly blank?: boolean | undefined;
  readonly menu?: boolean | undefined;
}

export interface TokenProps extends TokenFaceProps {
  readonly onPress: () => void;
}

export interface TermMenuProps<Value>
  extends Omit<TokenFaceProps, "menu" | "blank"> {
  readonly choices: readonly Choice<Value>[];
  readonly more: string;
  readonly onChoose: (value: Value) => void;
  readonly onMore: () => void;
}

export const TOKEN_GAP: number = ON_ANDROID ? 8 : 12;

const MARK = {
  ofWords: 0.5,
  least: 14,
  updown: "M2 6 L5 3 L8 6 M2 10 L5 13 L8 10",
  drop: "M7 10l5 5 5-5z",
} as const;

const styles = StyleSheet.create({
  token: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    maxWidth: "100%",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingVertical: 6,
  },
  ios: { borderRadius: 12, gap: 8, paddingHorizontal: 14 },
  android: { borderRadius: 8, gap: 4, paddingHorizontal: 12 },
  filled: { borderWidth: 1 },
  blank: { borderWidth: 1.5 },
  words: { flexShrink: 1 },
});

const drawnAs = (theme: Theme, blank: boolean): ViewStyle =>
  blank
    ? { borderColor: theme.colours.beam }
    : {
        backgroundColor: theme.colours.raised,
        borderColor: theme.colours.silverFaint,
      };

const tokenStyle = (theme: Theme, blank: boolean): StyleProp<ViewStyle> => [
  styles.token,
  ON_ANDROID ? styles.android : styles.ios,
  blank ? styles.blank : styles.filled,
  drawnAs(theme, blank),
];

const MenuMark = ({ set }: { readonly set: Role }) => {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const face = theme.type[set];
  const size =
    Math.max(MARK.least, face.size * MARK.ofWords) *
    Math.min(fontScale, face.cap ?? fontScale);

  return ON_ANDROID ? (
    <Svg height={size} testID="menu-mark" viewBox="0 0 24 24" width={size}>
      <Path d={MARK.drop} fill={theme.colours.silverDim} />
    </Svg>
  ) : (
    <Svg height={size} testID="menu-mark" viewBox="0 0 10 16" width={size}>
      <Path
        d={MARK.updown}
        fill="none"
        stroke={theme.colours.silverDim}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
      />
    </Svg>
  );
};

const Face = ({
  words,
  set,
  tone,
  blank = false,
  menu = false,
}: TokenFaceProps) => (
  <>
    <Type set={set} style={styles.words} tone={blank ? "beam" : tone}>
      {words}
    </Type>
    {menu && <MenuMark set={set} />}
  </>
);

export const TokenFace = (
  props: Omit<TokenFaceProps, "blank">,
): ReactElement => {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={props.words}
      accessibilityRole="button"
      accessible
      style={tokenStyle(theme, false)}
    >
      <Face {...props} />
    </View>
  );
};

export const Token = ({ onPress, ...face }: TokenProps): ReactElement => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={tokenStyle(theme, face.blank === true)}
    >
      <Face {...face} />
    </TouchableOpacity>
  );
};
