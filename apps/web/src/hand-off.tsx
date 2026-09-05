import type { SeatGroupResult, SeatScout } from "@seatscout/client";
import { useRef, useState, useSyncExternalStore } from "react";
import type { Checkout, Clock } from "./app.js";
import { seatsOf } from "./derived.js";
import {
  type Answer,
  Commit,
  Gone,
  type Phase,
  Provenance,
  spokenOf,
  Unreached,
} from "./hand-off-verdicts.js";
import { modal } from "./modal.js";
import { ageOf, clockOf, dayOf, labelOf, whyOf } from "./phrases.js";
import { RoomPlan } from "./room-plan.js";

interface HandOffProps {
  readonly candidate: SeatGroupResult;
  readonly verify: SeatScout["verify"];
  readonly checkout: Checkout;
  readonly clock: Clock;
  readonly today: string;
  readonly onClose: () => void;
}

interface Stage {
  readonly candidate: SeatGroupResult;
  readonly answer: Answer | null;
  readonly phase: Phase;
}

interface ScreenProps {
  readonly stage: Stage;
  readonly now: number;
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
  candidate,
  phase,
  now,
  today,
  onTake,
}: Omit<ScreenProps, "stage" | "onChoose"> & {
  readonly candidate: SeatGroupResult;
  readonly phase: Phase;
}) => (
  <>
    <p className="eyebrow">{showingOf(candidate, today)}</p>
    <h2 id="hand-off-title" className="display name">
      {candidate.showtime.presentation.theater.name}
    </h2>
    <div className="big-plan">
      <RoomPlan result={candidate} scale={3} />
    </div>
    <ul className="legend">
      <li>
        <i className="lit" />
        {labelOf(seatsOf(candidate))}, yours
      </li>
    </ul>
    <p className="why">{whyOf(candidate.reasons, candidate.podDividers)}</p>
    <Provenance
      line={`1 source · ${ageOf(candidate.fetchedAt, now)} ago · judged bookable`}
      note="Not confirmed by a second Source"
    />
    <div className="cta">
      {phase === "idle" && (
        <p className="micro">
          Tapping re-checks these seats with the Source, then opens the
          ticketing page with this showtime selected. seatscout never holds
          seats.
        </p>
      )}
      <Commit
        candidate={candidate}
        phase={phase}
        label={`Take ${spokenOf(seatsOf(candidate))}`}
        onTake={onTake}
      />
    </div>
  </>
);

const Screen = ({ stage, now, today, onTake, onChoose }: ScreenProps) => {
  const { candidate, answer, phase } = stage;
  if (answer === null)
    return (
      <Ready
        candidate={candidate}
        phase={phase}
        now={now}
        today={today}
        onTake={onTake}
      />
    );
  switch (answer.kind) {
    case "taken":
      return (
        <Gone
          candidate={candidate}
          answer={answer}
          phase={phase}
          now={now}
          onTake={onTake}
          onChoose={onChoose}
        />
      );
    case "unreachable":
      return (
        <Unreached
          candidate={candidate}
          at={answer.at}
          phase={phase}
          now={now}
          onTake={onTake}
        />
      );
  }
};

export const HandOff = ({
  candidate: opened,
  verify,
  checkout,
  clock,
  today,
  onClose,
}: HandOffProps) => {
  const now = useSyncExternalStore(clock.subscribe, clock.now);
  const [stage, setStage] = useState<Stage>({
    candidate: opened,
    answer: null,
    phase: "idle",
  });
  const closed = useRef(false);
  const attach = useRef((dialog: HTMLDialogElement) => {
    const close = modal(dialog);
    return () => {
      closed.current = true;
      close();
    };
  }).current;

  const take = async () => {
    const { candidate } = stage;
    setStage((current) => ({ ...current, phase: "checking" }));
    const verified = await verify(candidate);
    if (closed.current) return;
    if (verified.ok) {
      checkout(verified.ticketing);
      setStage((current) => ({ ...current, phase: "opening" }));
      return;
    }
    const at = clock.now();
    setStage((current) =>
      verified.reason === "taken"
        ? {
            candidate: verified.alternatives[0] ?? candidate,
            answer: {
              kind: "taken",
              lost: candidate,
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
      ref={attach}
      className="hand-off"
      aria-labelledby="hand-off-title"
      onClose={onClose}
    >
      <form method="dialog">
        <button type="submit" className="back">
          ‹ Back to the list
        </button>
      </form>
      <Screen
        stage={stage}
        now={now}
        today={today}
        onTake={take}
        onChoose={(alternative) =>
          setStage((current) => ({ ...current, candidate: alternative }))
        }
      />
    </dialog>
  );
};
