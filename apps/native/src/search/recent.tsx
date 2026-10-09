import type { RecentSearch } from "@seatscout/client";
import {
  carriedTitleOf,
  isPast,
  NOTHING_REMEMBERED,
  saidOf,
  type Terms,
  RUN_AGAIN,
  termsOf,
  WHAT_IT_DOES,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { ListRow } from "../design-system/list-row.js";
import { Type } from "../design-system/type.js";

export interface RecentProps {
  readonly remembered: readonly RecentSearch[] | undefined;
  readonly today: string;
  readonly onRun: (terms: Terms) => void;
}

const styles = StyleSheet.create({
  again: { paddingHorizontal: 18, paddingTop: 26 },
  heading: { paddingBottom: 8 },
  purpose: { paddingBottom: 22 },
  said: { flexShrink: 1, gap: 1 },
});

const Row = ({
  search,
  today,
  first,
  last,
  onRun,
}: {
  readonly search: RecentSearch;
  readonly today: string;
  readonly first: boolean;
  readonly last: boolean;
  readonly onRun: (terms: Terms) => void;
}) => (
  <ListRow
    first={first}
    label={`${carriedTitleOf(search)}, ${saidOf(search, today)}`}
    last={last}
    onPress={() => onRun(termsOf({ ...search, date: search.dates }, today))}
  >
    <View style={styles.said}>
      <Type set="marqueeRow" tone="silver">
        {carriedTitleOf(search)}
      </Type>
      <Type set="ledgerRow" tone="silverFaint">
        {saidOf(search, today)}
      </Type>
    </View>
  </ListRow>
);

export const Recent = ({
  remembered,
  today,
  onRun,
}: RecentProps): ReactElement => {
  const offered = remembered?.filter((search) => !isPast(search.dates, today));
  const none = offered?.length === 0;

  return (
    <View style={styles.again}>
      {none && (
        <Type set="sentence" style={styles.purpose} tone="silverDim">
          {WHAT_IT_DOES}
        </Type>
      )}
      <Type
        accessibilityRole="header"
        set="ledgerLabel"
        style={styles.heading}
        tone="silverFaint"
      >
        {RUN_AGAIN}
      </Type>
      {none && (
        <Type set="sentenceSmall" tone="silverFaint">
          {NOTHING_REMEMBERED}
        </Type>
      )}
      {offered?.map((search, at) => (
        <Row
          first={at === 0}
          key={`${search.movie}|${search.dates.join()}|${search.area}|${search.partySize}`}
          last={at === offered.length - 1}
          onRun={onRun}
          search={search}
          today={today}
        />
      ))}
    </View>
  );
};
