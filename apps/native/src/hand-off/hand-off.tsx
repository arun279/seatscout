import type { SeatGroupResult, SeatScout } from "@seatscout/client";
import {
  BACK_TO_THE_LIST,
  CHECK_AGAIN,
  RE_CHECKED_THEN_OPENED,
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

  const phased = (next: Phase) => setHeld((now) => ({ ...now, phase: next }));

  const take = async () => {
    phased("checking");
    const verified = await verify(chosen);
    if (gone.current) return;
    if (verified.ok) {
      phased("opening");
      const opened = await checkout(verified.ticketing).then(
        () => true,
        () => false,
      );
      if (gone.current) return;
      if (opened) onClose();
      else phased("idle");
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

  const commit = (label: string, note?: string) => (
    <CommitZone
      chosen={chosen}
      label={label}
      note={note}
      online={online}
      onTake={() => void take()}
      phase={phase}
    />
  );

  const dock = () => {
    if (answer === null) return commit(takeOf(chosen), RE_CHECKED_THEN_OPENED);
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
            ? (alternative) =>
                setHeld((now) => ({ ...now, chosen: alternative }))
            : undefined
        }
      />
    );
  };

  return (
    <View ref={bound} testID="hand-off">
      <Sheet
        claimed={false}
        dock={dock()}
        fitted
        heading={headingOf(held)}
        keep={BACK_TO_THE_LIST}
        onKeep={onClose}
      >
        <View style={styles.body}>{verdict()}</View>
      </Sheet>
    </View>
  );
};
