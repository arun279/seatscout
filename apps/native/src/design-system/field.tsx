import type { ReactElement, ReactNode } from "react";
import { StyleSheet, TextInput, View, type ViewStyle } from "react-native";
import { type Theme, useTheme } from "../theme.js";
import { ON_ANDROID } from "./platform.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface SectionProps {
  readonly label: string;
  readonly children: ReactNode;
}

export interface FieldProps extends Omit<SectionProps, "children"> {
  readonly value: string;
  readonly onTyped: (typed: string) => void;
  readonly onSettled?: () => void;
  readonly focused: boolean;
  readonly children?: ReactNode;
}

const styles = StyleSheet.create({
  section: { gap: 9, paddingHorizontal: 18, paddingTop: 14 },
  box: {
    justifyContent: "center",
    minHeight: 48,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: 14,
  },
  raised: { borderRadius: 12, borderWidth: 1 },
  underlined: {
    borderBottomWidth: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});

export const fieldBox: readonly ViewStyle[] = [
  styles.box,
  ON_ANDROID ? styles.underlined : styles.raised,
];

export const fieldColours = (theme: Theme): ViewStyle =>
  ON_ANDROID
    ? {
        backgroundColor: theme.colours.high,
        borderColor: theme.colours.beamDim,
      }
    : {
        backgroundColor: theme.colours.houseDeep,
        borderColor: theme.colours.hairline,
      };

export const Section = ({ label, children }: SectionProps): ReactElement => (
  <View style={styles.section}>
    <Type set="ledgerLabel" tone="silverFaint">
      {label}
    </Type>
    {children}
  </View>
);

export const Field = ({
  label,
  value,
  onTyped,
  onSettled,
  focused,
  children,
}: FieldProps): ReactElement => {
  const theme = useTheme();
  const face = theme.type.ledgerField;

  return (
    <Section label={label}>
      <TextInput
        accessibilityLabel={label}
        autoFocus={focused}
        onBlur={onSettled}
        onChangeText={onTyped}
        style={[
          fieldBox,
          fieldColours(theme),
          {
            color: theme.colours.silver,
            fontFamily: face.family,
            fontSize: face.size,
          },
        ]}
        value={value}
      />
      {children}
    </Section>
  );
};
