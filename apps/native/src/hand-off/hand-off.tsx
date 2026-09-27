import type { SeatGroupResult, SeatScout } from "@seatscout/client";
import {
  BACK_TO_THE_LIST,
  CHECK_AGAIN,
  takeOf,
  UNREACHABLE,
  uncheckedOf,
  wentOf,
} from "@seatscout/view-logic";
import { type ReactElement, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ghost } from "../design-system/button.js";
import { warned } from "../design-system/feedback.js";
import { Sheet } from "../design-system/sheet.js";
import type { Checkout } from "../host/checkout.js";
import type { Clock } from "../host/clock.js";
import {
  type Answer,
  CommitZone,
  Gone,
  type Phase,
  Ready,
  Unchecked,
} from "./verdicts.js";

export interface HandOffProps {
  readonly chosen: SeatGroupResult;
  readonly verify: SeatScout["verify"];
  readonly checkout: Checkout;
  readonly clock: Clock;
  readonly online: boolean;
  readonly today: string;
  readonly onClose: () => void;
}

interface Held {
  readonly chosen: SeatGroupResult;
  readonly answer: Answer | null;
  readonly phase: Phase;
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  body: { gap: 10, paddingHorizontal: 18, paddingTop: 12 },
});

const headingOf = ({ chosen, answer }: Held): string => {
  if (answer === null) return chosen.showtime.presentation.theater.name;
  return answer.kind === "taken"
    ? wentOf(answer.lost, answer.alternatives.length > 0)
    : UNREACHABLE;
};

export const HandOff = ({
  chosen: opened,
  verify,
  checkout,
  clock,
  online,
  today,
  onClose,
}: HandOffProps): ReactElement => {
  const [held, setHeld] = useState<Held>({
    chosen: opened,
    answer: null,
    phase: "idle",
  });
  const gone = useRef(false);
  const [bound] = useState(() => (node: View | null) => {
    gone.current = node === null;
  });
  const { chosen, answer, phase } = held;

  const take = async () => {
    setHeld({ ...held, phase: "checking" });
    const verified = await verify(chosen);
    if (gone.current) return;
    if (verified.ok) {
      setHeld({ ...held, phase: "opening" });
      await checkout(verified.ticketing);
      if (!gone.current) onClose();
      return;
    }
    const at = clock.now();
    if (verified.reason === "unreachable") {
      setHeld({ chosen, answer: { kind: "unreachable", at }, phase: "idle" });
      return;
    }
    warned();
    setHeld({
      chosen: verified.alternatives[0] ?? chosen,
      answer: {
        kind: "taken",
        lost: chosen,
        alternatives: verified.alternatives,
        at,
      },
      phase: "idle",
    });
  };

  const commit = (label: string) => (
    <CommitZone
      chosen={chosen}
      label={label}
      online={online}
      onTake={() => void take()}
      phase={phase}
    />
  );

  const dock = () => {
    if (answer === null) return commit(takeOf(chosen));
    if (answer.kind === "unreachable") return commit(CHECK_AGAIN);
    return answer.alternatives.length === 0 ? (
      <Ghost label={BACK_TO_THE_LIST} onPress={onClose} />
    ) : (
      commit(takeOf(chosen))
    );
  };

  const verdict = () => {
    if (answer === null)
      return <Ready chosen={chosen} clock={clock} today={today} />;
    if (answer.kind === "unreachable")
      return (
        <Unchecked at={answer.at} clock={clock} said={uncheckedOf(chosen)} />
      );
    return (
      <Gone
        answer={answer}
        chosen={chosen}
        clock={clock}
        onChoose={
          phase === "idle"
            ? (alternative) => setHeld({ ...held, chosen: alternative })
            : undefined
        }
      />
    );
  };

  return (
    <View ref={bound} style={styles.sheet} testID="hand-off">
      <Sheet
        claimed={false}
        dock={dock()}
        heading={headingOf(held)}
        keep={BACK_TO_THE_LIST}
        onKeep={onClose}
      >
        <View style={styles.body}>{verdict()}</View>
      </Sheet>
    </View>
  );
};
