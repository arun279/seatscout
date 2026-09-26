import type { Snapshot } from "@seatscout/client";
import {
  accountOf,
  coverageOf,
  LEDGER,
  readMoreOf,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ghost } from "../design-system/button.js";
import { WIDE_SLOP } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

export interface StripProps {
  readonly snapshot: Snapshot;
  readonly today: string;
  readonly onLedger: () => void;
  readonly onReadMore: () => void;
}

const styles = StyleSheet.create({
  strip: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 4,
    marginHorizontal: 22,
    marginTop: 10,
    paddingTop: 9,
  },
  said: { flexShrink: 1 },
  go: { justifyContent: "center", minHeight: 16, minWidth: 28 },
  track: {
    borderRadius: 1,
    height: 2,
    marginHorizontal: 22,
    marginTop: 8,
    overflow: "hidden",
  },
  read: { borderRadius: 1, height: "100%" },
  more: { marginHorizontal: 18, marginTop: 8 },
});

const shareOf = (snapshot: Snapshot) => {
  const account = accountOf(snapshot.coverage);
  return account.candidates === 0 ? 0 : account.checked / account.candidates;
};

export const Strip = ({
  snapshot,
  today,
  onLedger,
  onReadMore,
}: StripProps): ReactElement => {
  const theme = useTheme();
  const more = readMoreOf(snapshot, today);
  const counted =
    snapshot.phase !== "resolving" && snapshot.phase !== "unreachable";

  return (
    <View>
      <View
        style={[styles.strip, { borderTopColor: theme.colours.hairline }]}
        testID="strip"
      >
        <Type
          aria-live="polite"
          role="status"
          set="ledgerRow"
          style={styles.said}
          tone="silverDim"
        >
          {coverageOf(snapshot)}
        </Type>
        {counted && (
          <TouchableOpacity
            accessibilityRole="button"
            hitSlop={WIDE_SLOP}
            onPress={onLedger}
            style={styles.go}
          >
            <Type set="ledgerRow" tone="beamDim">
              {LEDGER}
            </Type>
          </TouchableOpacity>
        )}
      </View>
      {snapshot.phase === "searching" && (
        <View
          style={[styles.track, { backgroundColor: theme.colours.high }]}
          testID="progress"
        >
          <View
            style={[
              styles.read,
              {
                backgroundColor: theme.colours.beam,
                width: `${shareOf(snapshot) * 100}%`,
              },
            ]}
            testID="read"
          />
        </View>
      )}
      {more !== null && (
        <View style={styles.more}>
          <Ghost label={more} onPress={onReadMore} />
        </View>
      )}
    </View>
  );
};
