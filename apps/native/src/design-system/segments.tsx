import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme.js";
import type { Chip } from "./chips.js";
import { felt } from "./feedback.js";
import { ON_ANDROID } from "./platform.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface SegmentsProps<Named extends string> {
  readonly segments: readonly Chip<Named>[];
  readonly chosen: Named;
  readonly onChosen: (chosen: Named) => void;
}

const styles = StyleSheet.create({
  track: { flexDirection: "row" },
  sunk: { borderRadius: 12, padding: 3 },
  outlined: { borderRadius: 100, borderWidth: 1, overflow: "hidden" },
  segment: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: 4,
  },
  lifted: { borderRadius: 9 },
  divided: { borderLeftWidth: 1 },
});

export const Segments = <Named extends string>({
  segments,
  chosen,
  onChosen,
}: SegmentsProps<Named>): ReactElement => {
  const { colours } = useTheme();

  return (
    <View
      style={[
        styles.track,
        ON_ANDROID
          ? [styles.outlined, { borderColor: colours.silverFaint }]
          : [styles.sunk, { backgroundColor: colours.raised }],
      ]}
    >
      {segments.map(({ value, text }, at) => {
        const picked = value === chosen;
        return (
          <TouchableOpacity
            accessibilityLabel={text}
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            key={value}
            onPress={felt(() => onChosen(value))}
            style={[
              styles.segment,
              ON_ANDROID
                ? at > 0 && [
                    styles.divided,
                    { borderColor: colours.silverFaint },
                  ]
                : styles.lifted,
              picked && {
                backgroundColor: colours.chosen,
              },
            ]}
          >
            <Type set="sentenceSmall" tone={picked ? "onChosen" : "silverDim"}>
              {text}
            </Type>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
