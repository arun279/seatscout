import type { Format, SeatGroupResult } from "@seatscout/client";
import {
  ageOf,
  clockOf,
  designationsOf,
  labelOf,
  notBookableOf,
  ONE_SOURCE,
  roomNameOf,
  whyOf,
} from "@seatscout/view-logic";
import { type ReactElement, useSyncExternalStore } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { RoomPlan } from "../design-system/room-plan.js";
import { SEATS_SLOP, TOUCH_FLOOR } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import type { Clock } from "../host/clock.js";
import { useTheme } from "../theme.js";

export interface CardProps {
  readonly result: SeatGroupResult;
  readonly clock: Clock;
  readonly online: boolean;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
}

const PLAN_ACROSS = 54;

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    marginHorizontal: 14,
    minHeight: 68,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  body: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 13,
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
  },
  mid: { flex: 1, gap: 3, minWidth: 0 },
  place: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  format: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  side: { alignItems: "flex-end", gap: 5 },
  seats: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 16,
    minWidth: 28,
  },
});

const Age = ({
  clock,
  fetchedAt,
}: {
  readonly clock: Clock;
  readonly fetchedAt: number;
}) => {
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  return (
    <Type set="ledgerRow" tone="silverFaint">
      {ageOf(fetchedAt, now)}
    </Type>
  );
};

const Tag = ({ format }: { readonly format: Format }) => {
  const theme = useTheme();

  return (
    <View
      style={[styles.format, { borderColor: theme.colours.beamDim }]}
      testID={`format-${format}`}
    >
      <Type set="ledgerTag" tone="beamDim">
        {format}
      </Type>
    </View>
  );
};

export const Card = ({
  result,
  clock,
  online,
  onRoom,
  onHandOff,
}: CardProps): ReactElement => {
  const theme = useTheme();
  const { theater, formats } = result.showtime.presentation;
  const notBookable = notBookableOf(result);
  const designations = designationsOf(result);
  const seats = (
    <Type set="ledgerSeats" tone="beam">
      {labelOf(result)}
    </Type>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colours.raised,
          borderColor:
            theme.appearance === "down"
              ? theme.colours.high
              : theme.colours.hairline,
        },
      ]}
      testID="card"
    >
      <TouchableOpacity
        accessibilityLabel={roomNameOf(result)}
        accessibilityRole="button"
        onPress={() => onRoom(result)}
        style={styles.body}
        testID="body"
      >
        <RoomPlan across={PLAN_ACROSS} result={result} />
        <View style={styles.mid}>
          <View style={styles.place}>
            <Type set="sentenceLead" tone="silver">
              {theater.name}
            </Type>
            {formats.map((format) => (
              <Tag format={format} key={format} />
            ))}
          </View>
          <Type set="sentenceSmall" tone="silverDim">
            {`${clockOf(result.showtime.startsAt)} · ${whyOf(result.reasons, result.podDividers)}`}
          </Type>
          {notBookable !== null && (
            <Type set="sentenceSmall" tone="velvetLit">
              {notBookable}
            </Type>
          )}
          {designations !== null && (
            <Type set="ledgerRow" tone="beamDim">
              {designations}
            </Type>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.side}>
        {online ? (
          <TouchableOpacity
            accessibilityRole="button"
            hitSlop={SEATS_SLOP}
            onPress={() => onHandOff(result)}
            style={styles.seats}
            testID="seats"
          >
            {seats}
          </TouchableOpacity>
        ) : (
          seats
        )}
        <Type set="ledgerTag" tone="silverFaint">
          {ONE_SOURCE}
        </Type>
        <Age clock={clock} fetchedAt={result.fetchedAt} />
      </View>
    </View>
  );
};
