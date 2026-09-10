import "./house.css";
import "./hand-off.css";
import type { SeatGroupResult, SeatScout } from "@seatscout/client";
import type { ReactElement } from "react";
import { useRef, useState, useSyncExternalStore } from "react";
import type { Checkout, Clock } from "./app.js";
import {
  type Answer,
  CommitZone,
  Gone,
  HAND_OFF_TITLE_ID,
  Heading,
  type Phase,
  Provenance,
  Unreached,
} from "./hand-off-verdicts.js";
import { modal } from "./modal.js";
import { ageOf, clockOf, dayOf, labelOf, spokenOf, whyOf } from "./phrases.js";
import { RoomPlan } from "./room-plan.js";

interface HandOffProps {
  readonly chosen: SeatGroupResult;
  readonly verify: SeatScout["verify"];
  readonly checkout: Checkout;
  readonly clock: Clock;
  readonly online: boolean;
  readonly today: string;
  readonly onClose: () => void;
}

interface Sheet {
  readonly chosen: SeatGroupResult;
  readonly answer: Answer | null;
  readonly phase: Phase;
}

interface ScreenProps {
  readonly sheet: Sheet;
  readonly now: number;
  readonly online: boolean;
  readonly today: string;
  readonly onTake: () => void;
  readonly onChoose: (alternative: SeatGroupResult) => void;
}

const showingOf = (result: SeatGroupResult, today: string) =>
  [
    `${dayOf(result.terms.date, today)} ${clockOf(result.showtime.startsAt)}`,
    ...result.showtime.presentation.formats,
  ].join(" · ");

const Ready = ({
  chosen,
  phase,
  now,
  online,
  today,
  onTake,
}: Omit<ScreenProps, "sheet" | "onChoose"> & {
  readonly chosen: SeatGroupResult;
  readonly phase: Phase;
}) => (
  <>
    <p className="eyebrow">{showingOf(chosen, today)}</p>
    <Heading className="display name" focus={false}>
      {chosen.showtime.presentation.theater.name}
    </Heading>
    <div className="big-plan">
      <RoomPlan result={chosen} scale={3} />
    </div>
    <ul className="legend">
      <li>
        <i className="lit" />
        {labelOf(chosen)}, yours
      </li>
    </ul>
    <p className="why">{whyOf(chosen.reasons, chosen.podDividers)}</p>
    <Provenance
      line={`1 source · ${ageOf(chosen.fetchedAt, now)} ago · judged bookable`}
      note="Not confirmed by a second Source"
    />
    <div className="cta">
      {phase === "idle" && online && (
        <p className="micro">
          Tapping re-checks these seats with the Source, then opens the
          ticketing page with this showtime selected. seatscout never holds
          seats.
        </p>
      )}
      <CommitZone
        chosen={chosen}
        phase={phase}
        online={online}
        label={`Take ${spokenOf(chosen)}`}
        onTake={onTake}
      />
    </div>
  </>
);

const Screen = ({
  sheet,
  now,
  online,
  today,
  onTake,
  onChoose,
}: ScreenProps) => {
  const { chosen, answer, phase } = sheet;
  if (answer === null)
    return (
      <Ready
        chosen={chosen}
        phase={phase}
        now={now}
        online={online}
        today={today}
        onTake={onTake}
      />
    );
  switch (answer.kind) {
    case "taken":
      return (
        <Gone
          chosen={chosen}
          answer={answer}
          phase={phase}
          now={now}
          online={online}
          onTake={onTake}
          onChoose={onChoose}
        />
      );
    case "unreachable":
      return (
        <Unreached
          chosen={chosen}
          at={answer.at}
          phase={phase}
          now={now}
          online={online}
          onTake={onTake}
        />
      );
  }
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
  const now = useSyncExternalStore(clock.subscribe, clock.now);
  const [sheet, setSheet] = useState<Sheet>({
    chosen: opened,
    answer: null,
    phase: "idle",
  });
  const closed = useRef(false);
  const close = () => {
    closed.current = true;
    onClose();
  };
  const bindDialog = useRef((node: HTMLDialogElement) => {
    const cleanup = modal(node);
    return () => {
      closed.current = true;
      cleanup();
    };
  }).current;
  const take = async () => {
    const { chosen } = sheet;
    setSheet((current) => ({ ...current, phase: "checking" }));
    const verified = await verify(chosen);
    if (closed.current) return;
    if (verified.ok) {
      checkout(verified.ticketing);
      setSheet((current) => ({ ...current, phase: "opening" }));
      return;
    }
    const at = clock.now();
    setSheet((current) =>
      verified.reason === "taken"
        ? {
            chosen: verified.alternatives[0] ?? chosen,
            answer: {
              kind: "taken",
              lost: chosen,
              alternatives: verified.alternatives,
              at,
            },
            phase: "idle",
          }
        : { ...current, answer: { kind: "unreachable", at }, phase: "idle" },
    );
  };

  return (
    <dialog
      ref={bindDialog}
      className="hand-off"
      aria-labelledby={HAND_OFF_TITLE_ID}
      onClose={close}
    >
      <form method="dialog">
        <button type="submit" className="back">
          ‹ Back to the list
        </button>
      </form>
      <Screen
        sheet={sheet}
        now={now}
        online={online}
        today={today}
        onTake={take}
        onChoose={(alternative) =>
          setSheet((current) => ({ ...current, chosen: alternative }))
        }
      />
    </dialog>
  );
};
