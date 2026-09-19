import type { Snapshot } from "@seatscout/client";
import {
  CHANGE_THE_QUERY,
  emptyOf,
  nameOf,
  notAnAnswerAbout,
  partialOf,
  RETRY_THE_SEARCH,
  retryOf,
  talliesOf,
  type Term,
  type Terms,
  UNREACHED,
  UNREADABLE,
  WAITING_TO_RETRY,
  WIDEN,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Ghost, Velvet } from "../design-system/button.js";
import { Type } from "../design-system/type.js";

interface RemedyProps {
  readonly online: boolean;
  readonly onRetry: () => void;
  readonly onEdit: (term: Term) => void;
}

interface VerdictProps extends RemedyProps {
  readonly snapshot: Snapshot;
}

export interface EmptyProps {
  readonly snapshot: Snapshot;
  readonly terms: Terms;
  readonly when: string;
  readonly onEdit: (term: Term) => void;
}

const styles = StyleSheet.create({
  verdict: { gap: 11, paddingHorizontal: 18, paddingTop: 16 },
  counts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    paddingVertical: 2,
  },
  tally: { gap: 1 },
  named: { gap: 5 },
});

const Remedy = ({
  online,
  retry,
  onRetry,
  onEdit,
}: RemedyProps & { readonly retry: string }) => (
  <>
    {online ? (
      <Velvet label={retry} onPress={onRetry} />
    ) : (
      <Ghost label={WAITING_TO_RETRY} />
    )}
    <Ghost label={WIDEN} onPress={() => onEdit("movie")} />
  </>
);

export const Unreachable = ({
  when,
  ...remedy
}: RemedyProps & { readonly when: string }): ReactElement => (
  <View style={styles.verdict} testID="verdict">
    <Type accessibilityRole="header" set="marqueeVerdict" tone="silver">
      {UNREADABLE}
    </Type>
    <Type set="sentence" tone="silverDim">
      {notAnAnswerAbout(when)}
    </Type>
    <Remedy {...remedy} retry={RETRY_THE_SEARCH} />
  </View>
);

export const Partial = ({
  snapshot,
  ...remedy
}: VerdictProps): ReactElement => (
  <View style={styles.verdict} testID="verdict">
    <Type accessibilityRole="header" set="marqueeVerdict" tone="silver">
      {partialOf(snapshot)}
    </Type>
    <View style={styles.counts}>
      {talliesOf(snapshot).map((tally) => (
        <View key={tally.word} style={styles.tally}>
          <Type set="ledgerCount" tone="silver">
            {tally.figure}
          </Type>
          <Type set="ledgerTag" tone="silverFaint">
            {tally.word}
          </Type>
        </View>
      ))}
    </View>
    <Type set="ledgerLabel" tone="silverFaint">
      {UNREACHED}
    </Type>
    <View style={styles.named}>
      {snapshot.coverage.failed.map((showtime) => (
        <Type key={showtime.id} set="ledgerRow" tone="silverDim">
          {nameOf(showtime)}
        </Type>
      ))}
    </View>
    <Remedy {...remedy} retry={retryOf(snapshot.coverage.failed.length)} />
  </View>
);

export const Empty = ({
  snapshot,
  terms,
  when,
  onEdit,
}: EmptyProps): ReactElement => {
  const nothingListed = snapshot.coverage.candidates === 0;
  const verdict = emptyOf(snapshot, terms, when);

  return (
    <View style={styles.verdict} testID="verdict">
      <Type accessibilityRole="header" set="marqueeVerdict" tone="silver">
        {verdict.said}
      </Type>
      {verdict.ledes.map((lede) => (
        <Type key={lede} set="sentence" tone="silverDim">
          {lede}
        </Type>
      ))}
      <Velvet
        label={CHANGE_THE_QUERY}
        onPress={() => onEdit(nothingListed ? "formats" : "partySize")}
      />
    </View>
  );
};
