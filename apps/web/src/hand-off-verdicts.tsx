import "./house.css";
import "./hand-off.css";
import type { SeatGroupResult } from "@seatscout/client";
import {
  ageOf,
  clockOf,
  labelOf,
  lateralOf,
  partyOf,
  spokenOf,
} from "./phrases.js";
import { RoomPlan } from "./room-plan.js";

export const HAND_OFF_TITLE_ID = "hand-off-title";

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

interface AnswerProps {
  readonly chosen: SeatGroupResult;
  readonly phase: Phase;
  readonly now: number;
  readonly online: boolean;
  readonly onTake: () => void;
}

const focusOnMount = (heading: HTMLHeadingElement | null) => heading?.focus();

export const Heading = ({
  children,
  className = "display went",
  focus = true,
}: {
  readonly children: string;
  readonly className?: string;
  readonly focus?: boolean;
}) => (
  <h2
    id={HAND_OFF_TITLE_ID}
    className={className}
    tabIndex={focus ? -1 : undefined}
    ref={focus ? focusOnMount : undefined}
  >
    {children}
  </h2>
);

export const Provenance = ({
  line,
  note,
}: {
  readonly line: string;
  readonly note: string;
}) => (
  <div className="prov">
    <span>{line}</span>
    <span className="p2">{note}</span>
  </div>
);

const BackToList = () => (
  <form method="dialog">
    <button type="submit" className="btn btn-ghost">
      Back to the list
    </button>
  </form>
);

export const CommitZone = ({
  chosen,
  phase,
  online,
  label,
  onTake,
}: Omit<AnswerProps, "now"> & { readonly label: string }) => {
  if (!online)
    return (
      <p className="micro" role="status">
        Offline. Seats are never cached, so this hand-off can be checked when
        the connection returns.
      </p>
    );
  switch (phase) {
    case "opening":
      return (
        <p className="micro" role="status">
          Still there. Opening the ticketing page for{" "}
          {clockOf(chosen.showtime.startsAt)} at{" "}
          {chosen.showtime.presentation.theater.name}.
        </p>
      );
    case "checking":
      return (
        <>
          <p className="micro" role="status">
            Checking {spokenOf(chosen)} with the Source
          </p>
          <button type="button" className="btn btn-velvet" disabled>
            {label}
          </button>
        </>
      );
    case "idle":
      return (
        <button type="button" className="btn btn-velvet" onClick={onTake}>
          {label}
        </button>
      );
  }
};

const Chips = ({
  alternatives,
  chosen,
  disabled,
  onChoose,
}: {
  readonly alternatives: readonly SeatGroupResult[];
  readonly chosen: SeatGroupResult;
  readonly disabled: boolean;
  readonly onChoose: (alternative: SeatGroupResult) => void;
}) => (
  <ul className="chips" aria-labelledby="next-best">
    {alternatives.map((alternative) => (
      <li key={alternative.key}>
        <button
          type="button"
          className="chip"
          aria-pressed={alternative.key === chosen.key}
          disabled={disabled}
          onClick={() => onChoose(alternative)}
        >
          {labelOf(alternative)}{" "}
          <span className="sub">
            Row {alternative.reasons.rowFromFront} ·{" "}
            {lateralOf(alternative.reasons.seatsOffCentre)}
          </span>
        </button>
      </li>
    ))}
  </ul>
);

export const Gone = ({
  chosen,
  answer,
  phase,
  now,
  online,
  onTake,
  onChoose,
}: AnswerProps & {
  readonly answer: Taken;
  readonly onChoose: (alternative: SeatGroupResult) => void;
}) => {
  const age = ageOf(answer.at, now);
  const lost = spokenOf(answer.lost);
  const provenance = (
    <Provenance
      line={`Re-checked at hand-off · ${age} ago`}
      note="Judged not bookable · nothing was held"
    />
  );
  if (answer.alternatives.length === 0) {
    const party = partyOf(chosen.terms.partySize).toLowerCase();
    return (
      <>
        <Heading key={answer.lost.key}>
          {`${lost} just went, and nothing in this room replaces them.`}
        </Heading>
        <p className="body">
          The Source answered {age} ago and offered nothing else in this room
          for {party}. This screening is no longer on offer to you: sold out, no
          longer offered by the listing, already begun, off sale, without a seat
          map, or simply short of {party}, and the Source does not say which.
          seatscout never holds seats.
        </p>
        {provenance}
        <div className="cta">
          <BackToList />
        </div>
      </>
    );
  }
  return (
    <>
      <Heading key={answer.lost.key}>{`${lost} just went.`}</Heading>
      <p className="body">
        The Source answered {age} ago: at least one of them went while you were
        deciding. seatscout never holds seats, so the room has moved on. The
        plan is redrawn.
      </p>
      <div className="big-plan">
        <RoomPlan result={chosen} lost={answer.lost} scale={3} />
      </div>
      <ul className="legend">
        <li>
          <i className="lit" />
          next best
        </li>
        <li>
          <i className="lost" />
          where {labelOf(answer.lost)} were
        </li>
      </ul>
      <p id="next-best" className="eyebrow">
        Next best in this room
      </p>
      <Chips
        alternatives={answer.alternatives}
        chosen={chosen}
        disabled={phase === "checking"}
        onChoose={onChoose}
      />
      {provenance}
      <div className="cta">
        <CommitZone
          chosen={chosen}
          phase={phase}
          online={online}
          label={`Take ${spokenOf(chosen)}`}
          onTake={onTake}
        />
        <BackToList />
      </div>
    </>
  );
};

export const Unreached = ({
  chosen,
  at,
  phase,
  now,
  online,
  onTake,
}: AnswerProps & { readonly at: number }) => (
  <>
    <Heading key={at}>The Source could not be reached.</Heading>
    <p className="body">
      Nothing was checked, so {spokenOf(chosen)} may well still be there. A
      checkout never opens on an answer that could not be judged.
    </p>
    <Provenance
      line={`Hand-off · ${ageOf(at, now)} ago`}
      note="Nothing was read · nothing was held"
    />
    <div className="cta">
      <CommitZone
        chosen={chosen}
        phase={phase}
        online={online}
        label="Check again"
        onTake={onTake}
      />
      <BackToList />
    </div>
  </>
);
