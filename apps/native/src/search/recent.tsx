import type { RecentSearch } from "@seatscout/client";
import {
  NOTHING_REMEMBERED,
  saidOf,
  type Terms,
  termsOf,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { TOUCH_FLOOR } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

export interface RecentProps {
  readonly remembered: readonly RecentSearch[] | undefined;
  readonly today: string;
  readonly onRun: (terms: Terms) => void;
}

const styles = StyleSheet.create({
  again: { paddingHorizontal: 18, paddingTop: 26 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 56,
    minWidth: TOUCH_FLOOR,
    paddingVertical: 8,
  },
  go: { fontSize: 16 },
  said: { flexShrink: 1, gap: 1 },
});

const Row = ({
  search,
  today,
  last,
  onRun,
}: {
  readonly search: RecentSearch;
  readonly today: string;
  readonly last: boolean;
  readonly onRun: (terms: Terms) => void;
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={`${search.movie}, ${saidOf(search, today)}`}
      accessibilityRole="button"
      onPress={() => onRun(termsOf(search, today))}
      style={[
        styles.row,
        {
          borderBottomColor: theme.colours.hairline,
          borderBottomWidth: last ? 0 : 1,
        },
      ]}
    >
      <View style={styles.said}>
        <Type set="marqueeRow" tone="silver">
          {search.movie}
        </Type>
        <Type set="ledgerRow" tone="silverFaint">
          {saidOf(search, today)}
        </Type>
      </View>
      <Type set="sentenceStrong" style={styles.go} tone="beam">
        ›
      </Type>
    </TouchableOpacity>
  );
};

const Offered = ({ remembered, today, onRun }: RecentProps) => {
  if (remembered === undefined) return null;
  const offered = remembered.filter((search) => search.date >= today);

  if (offered.length === 0)
    return (
      <Type set="sentenceSmall" tone="silverFaint">
        {NOTHING_REMEMBERED}
      </Type>
    );

  return offered.map((search, at) => (
    <Row
      key={`${search.movie}|${search.date}|${search.area}|${search.partySize}`}
      last={at === offered.length - 1}
      onRun={onRun}
      search={search}
      today={today}
    />
  ));
};

export const Recent = (props: RecentProps): ReactElement => (
  <View style={styles.again}>
    <Type set="ledgerLabel" tone="silverFaint">
      Run again
    </Type>
    <Offered {...props} />
  </View>
);
