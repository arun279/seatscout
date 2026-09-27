import type { SeatGroupResult } from "@seatscout/client";
import {
  ageOf,
  checkingOf,
  handedOffOf,
  judgedOf,
  labelOf,
  movedOnOf,
  NEXT_BEST,
  NEXT_BEST_MARK,
  NOTHING_WAS_HELD,
  NOTHING_WAS_READ,
  OFFLINE_AT_HAND_OFF,
  offNowOf,
  openingOf,
  placeOf,
  recheckedOf,
  showingOf,
  UNCONFIRMED,
  whereTheyWereOf,
  whyOf,
  yoursOf,
} from "@seatscout/view-logic";
import { type ReactElement, type ReactNode, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { Ghost, Velvet } from "../design-system/button.js";
import { Choices } from "../design-system/chips.js";
import { RoomPlan } from "../design-system/room-plan.js";
import { Type } from "../design-system/type.js";
import type { Clock } from "../host/clock.js";
import { type Role, useTheme } from "../theme.js";

export interface Taken {
  readonly kind: "taken";
  readonly lost: SeatGroupResult;
  readonly alternatives: readonly SeatGroupResult[];
  readonly at: number;
}

export type Answer =
  | Taken
  | { readonly kind: "unreachable"; readonly at: number };

export type Phase = "idle" | "checking" | "opening";

const PLAN_ACROSS = 162;

const styles = StyleSheet.create({
  prov: { borderTopWidth: 1, gap: 4, marginTop: 6, paddingTop: 10 },
  plan: { alignItems: "center", paddingTop: 8 },
  legend: {
    columnGap: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 4,
  },
  entry: { alignItems: "center", flexDirection: "row", gap: 6 },
  lit: { borderRadius: 4, height: 8, width: 8 },
  lost: { borderRadius: 4, borderWidth: 1, height: 8, width: 8 },
  centred: { textAlign: "center" },
});

const Aged = ({
  clock,
  at,
  say,
  set,
}: {
  readonly clock: Clock;
  readonly at: number;
  readonly say: (age: string) => string;
  readonly set: Role;
}) => {
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  return (
    <Type set={set} tone="silverDim">
      {say(ageOf(at, now))}
    </Type>
  );
};

const Provenance = ({
  line,
  note,
}: {
  readonly line: ReactNode;
  readonly note: string;
}) => {
  const { colours } = useTheme();

  return (
    <View
      style={[styles.prov, { borderTopColor: colours.hairline }]}
      testID="provenance"
    >
      {line}
      <Type set="ledgerLabel" tone="velvetLit">
        {note}
      </Type>
    </View>
  );
};

const Legend = ({
  lit,
  lost,
}: {
  readonly lit: string;
  readonly lost?: string | undefined;
}) => {
  const { colours } = useTheme();

  return (
    <View style={styles.legend}>
      <View style={styles.entry}>
        <View
          style={[styles.lit, { backgroundColor: colours.beam }]}
          testID="lit-mark"
        />
        <Type set="ledgerLabel" tone="silverDim">
          {lit}
        </Type>
      </View>
      {lost !== undefined && (
        <View style={styles.entry}>
          <View
            style={[styles.lost, { borderColor: colours.velvetLit }]}
            testID="lost-mark"
          />
          <Type set="ledgerLabel" tone="silverDim">
            {lost}
          </Type>
        </View>
      )}
    </View>
  );
};

const Status = ({ children }: { readonly children: string }) => (
  <Type
    accessibilityLiveRegion="polite"
    role="status"
    set="sentenceSmall"
    style={styles.centred}
    tone="silverDim"
  >
    {children}
  </Type>
);

export interface CommitZoneProps {
  readonly chosen: SeatGroupResult;
  readonly phase: Phase;
  readonly online: boolean;
  readonly label: string;
  readonly note?: string | undefined;
  readonly onTake: () => void;
}

export const CommitZone = ({
  chosen,
  phase,
  online,
  label,
  note,
  onTake,
}: CommitZoneProps): ReactElement => {
  if (!online) return <Status>{OFFLINE_AT_HAND_OFF}</Status>;
  switch (phase) {
    case "opening":
      return <Status>{openingOf(chosen)}</Status>;
    case "checking":
      return <Ghost label={checkingOf(chosen)} />;
    case "idle":
      return (
        <>
          {note !== undefined && <Status>{note}</Status>}
          <Velvet label={label} onPress={onTake} />
        </>
      );
  }
};

export const Ready = ({
  chosen,
  clock,
  today,
}: {
  readonly chosen: SeatGroupResult;
  readonly clock: Clock;
  readonly today: string;
}): ReactElement => (
  <>
    <Type set="ledgerLabel" tone="silverFaint">
      {showingOf(chosen, today)}
    </Type>
    <View style={styles.plan}>
      <RoomPlan across={PLAN_ACROSS} result={chosen} />
    </View>
    <Legend lit={yoursOf(chosen)} />
    <Type set="sentenceSmall" style={styles.centred} tone="silverDim">
      {whyOf(chosen.reasons, chosen.podDividers)}
    </Type>
    <Provenance
      line={
        <Aged
          at={chosen.fetchedAt}
          clock={clock}
          say={judgedOf}
          set="ledgerLabel"
        />
      }
      note={UNCONFIRMED}
    />
  </>
);

export const Gone = ({
  chosen,
  answer,
  clock,
  onChoose,
}: {
  readonly chosen: SeatGroupResult;
  readonly answer: Taken;
  readonly clock: Clock;
  readonly onChoose: ((alternative: SeatGroupResult) => void) | undefined;
}): ReactElement => {
  const { alternatives, at, lost } = answer;
  const provenance = (
    <Provenance
      line={<Aged at={at} clock={clock} say={recheckedOf} set="ledgerLabel" />}
      note={NOTHING_WAS_HELD}
    />
  );

  if (alternatives.length === 0)
    return (
      <>
        <Aged
          at={at}
          clock={clock}
          say={(age) => offNowOf(age, chosen.terms.partySize)}
          set="sentence"
        />
        {provenance}
      </>
    );

  return (
    <>
      <Aged at={at} clock={clock} say={movedOnOf} set="sentence" />
      <View style={styles.plan}>
        <RoomPlan across={PLAN_ACROSS} lost={lost} result={chosen} />
      </View>
      <Legend lit={NEXT_BEST_MARK} lost={whereTheyWereOf(lost)} />
      {onChoose !== undefined && (
        <>
          <Type set="ledgerLabel" tone="silverFaint">
            {NEXT_BEST}
          </Type>
          <Choices
            choices={alternatives.map((alternative) => ({
              key: alternative.key,
              text: labelOf(alternative),
              sub: placeOf(alternative),
              value: alternative,
            }))}
            chosen={chosen.key}
            onChoose={onChoose}
          />
        </>
      )}
      {provenance}
    </>
  );
};

export const Unchecked = ({
  at,
  clock,
  said,
}: {
  readonly at: number;
  readonly clock: Clock;
  readonly said: string;
}): ReactElement => (
  <>
    <Type set="sentence" tone="silverDim">
      {said}
    </Type>
    <Provenance
      line={<Aged at={at} clock={clock} say={handedOffOf} set="ledgerLabel" />}
      note={NOTHING_WAS_READ}
    />
  </>
);
