import type { ReactElement, ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "../theme.js";
import { Type } from "./type.js";

export const LIST_PANE = 400;

const EXPANDED = 840;

const styles = StyleSheet.create({
  panes: { flex: 1, flexDirection: "row" },
  list: { borderRightWidth: 1, width: LIST_PANE },
  detail: { flex: 1 },
  waiting: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 26,
  },
  said: { maxWidth: 320, textAlign: "center" },
});

export const useTwoPanes = (): boolean =>
  useWindowDimensions().width >= EXPANDED;

export const Panes = ({
  list,
  detail,
}: {
  readonly list: ReactNode;
  readonly detail: ReactNode;
}): ReactElement => {
  const { colours } = useTheme();

  return (
    <View style={styles.panes}>
      <View
        style={[styles.list, { borderRightColor: colours.hairline }]}
        testID="list-pane"
      >
        {list}
      </View>
      <View
        style={[styles.detail, { backgroundColor: colours.houseDeep }]}
        testID="detail-pane"
      >
        {detail}
      </View>
    </View>
  );
};

export const Waiting = ({ said }: { readonly said: string }): ReactElement => (
  <View style={styles.waiting}>
    <Type set="sentence" style={styles.said} tone="silverDim">
      {said}
    </Type>
  </View>
);
