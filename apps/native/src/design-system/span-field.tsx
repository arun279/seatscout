import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { dateAt, listingDate } from "../host/clock.js";
import { PickerField } from "./picker-field.js";
import { Type } from "./type.js";

export interface SpanFieldProps {
  readonly first: string;
  readonly last: string;
  readonly labels: readonly [string, string];
  readonly endWords: readonly [string, string];
  readonly words: string;
  readonly onSpan: (first: string, last: string) => void;
}

const styles = StyleSheet.create({
  ends: { flexDirection: "row", gap: 10 },
  end: { flex: 1, gap: 6 },
});

export const SpanField = ({
  first,
  last,
  labels,
  endWords,
  onSpan,
}: SpanFieldProps): ReactElement => {
  const ends = [
    {
      label: labels[0],
      said: endWords[0],
      date: first,
      span: (date: string) => [date, last] as const,
    },
    {
      label: labels[1],
      said: endWords[1],
      date: last,
      span: (date: string) => [first, date] as const,
    },
  ];

  return (
    <View style={styles.ends}>
      {ends.map(({ label, said, date, span }) => (
        <View key={label} style={styles.end}>
          <Type set="ledgerLabel" tone="silverFaint">
            {label}
          </Type>
          <PickerField
            at={dateAt(date)}
            label={label}
            mode="date"
            onPicked={(picked) => onSpan(...span(listingDate(picked)))}
            words={said}
          />
        </View>
      ))}
    </View>
  );
};
