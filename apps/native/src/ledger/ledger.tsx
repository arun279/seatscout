import type { SearchTerms, SeatScout } from "@seatscout/client";
import {
  ACCOUNTED_FOR,
  BACK_TO_THE_LIST,
  type LedgerRow,
  ledgerOf,
  sumOf,
} from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Sheet } from "../design-system/sheet.js";
import { Type } from "../design-system/type.js";
import { clockAfter } from "../host/clock.js";
import { useSession, useShown } from "../host/session.js";
import { Retry } from "../search/verdicts.js";
import { useTheme } from "../theme.js";

export interface LedgerProps {
  readonly seatscout: SeatScout;
  readonly asked: SearchTerms;
  readonly online: boolean;
  readonly onClose: () => void;
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 18,
    paddingVertical: 14,
  },
  count: { minWidth: 44, textAlign: "right" },
  said: { flex: 1, gap: 3 },
  retry: { paddingTop: 10 },
});

const Row = ({
  row,
  online,
  onRetry,
}: {
  readonly row: LedgerRow;
  readonly online: boolean;
  readonly onRetry: () => void;
}) => {
  const { colours } = useTheme();

  return (
    <View
      style={[styles.row, { borderBottomColor: colours.hairline }]}
      testID="ledger-row"
    >
      <Type set="ledgerCount" style={styles.count} tone="silver">
        {row.count}
      </Type>
      <View style={styles.said}>
        <Type accessibilityRole="header" set="sentenceLead" tone="silver">
          {row.label}
        </Type>
        <Type set="sentenceSmall" tone="silverDim">
          {row.remedy}
        </Type>
        {row.named.map(({ key, said }) => (
          <Type key={key} set="ledgerRow" tone="silverDim">
            {said}
          </Type>
        ))}
        {row.retry !== null && (
          <View style={styles.retry}>
            <Retry online={online} onRetry={onRetry} retry={row.retry} />
          </View>
        )}
      </View>
    </View>
  );
};

export const Ledger = ({
  seatscout,
  asked,
  online,
  onClose,
}: LedgerProps): ReactElement => {
  const session = useSession(seatscout, asked);
  const snapshot = useShown(session);
  const retry = () => {
    void session.search.retry();
  };

  return (
    <Sheet
      claimed={false}
      dock={
        <Type set="ledger" tone="silverDim">
          {sumOf(snapshot, clockAfter)}
        </Type>
      }
      heading={ACCOUNTED_FOR}
      keep={BACK_TO_THE_LIST}
      onKeep={onClose}
    >
      {ledgerOf(snapshot, clockAfter).map((row) => (
        <Row key={row.label} online={online} onRetry={retry} row={row} />
      ))}
    </Sheet>
  );
};
