import type { SeatGroupResult } from "@seatscout/client";
import { seatsOf } from "./derived.js";
import { ageOf, clockOf, labelOf, lateralOf, partyOf } from "./phrases.js";
import { RoomPlan } from "./room-plan.js";

export const spokenOf = (seats: readonly string[]): string =>
  [seats.slice(0, -1).join(", "), seats.at(-1)].filter(Boolean).join(" and ");

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
  readonly candidate: SeatGroupResult;
  readonly phase: Phase;
  readonly now: number;
  readonly onTake: () => void;
}

const focused = (heading: HTMLHeadingElement | null) => heading?.focus();

const Heading = ({ children }: { readonly children: string }) => (
  <h2 id="hand-off-title" className="display went" tabIndex={-1} ref={focused}>
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

export const Commit = ({
  candidate,
  phase,
  label,
  onTake,
}: Omit<AnswerProps, "now"> & { readonly label: string }) => {
  switch (phase) {
    case "opening":
      return (
        <p className="micro" role="status">
          Still there. Opening the ticketing page for{" "}
          {clockOf(candidate.showtime.startsAt)} at{" "}
          {candidate.showtime.presentation.theater.name}.
        </p>
      );
    case "checking":
      return (
        <>
          <p className="micro" role="status">
            Checking {spokenOf(seatsOf(candidate))} with the Source
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
  candidate,
  onChoose,
}: {
  readonly alternatives: readonly SeatGroupResult[];
  readonly candidate: SeatGroupResult;
  readonly onChoose: (alternative: SeatGroupResult) => void;
}) => (
  <ul className="chips" aria-labelledby="next-best">
    {alternatives.map((alternative) => (
      <li key={alternative.key}>
        <button
          type="button"
          className="chip"
          aria-pressed={alternative.key === candidate.key}
          onClick={() => onChoose(alternative)}
        >
          {labelOf(seatsOf(alternative))}{" "}
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
  candidate,
  answer,
  phase,
  now,
  onTake,
  onChoose,
}: AnswerProps & {
  readonly answer: Taken;
  readonly onChoose: (alternative: SeatGroupResult) => void;
}) => {
  const age = ageOf(answer.at, now);
  const lost = spokenOf(seatsOf(answer.lost));
  const provenance = (
    <Provenance
      line={`Re-checked at hand-off · ${age} ago`}
      note="Judged not bookable · nothing was held"
    />
  );
  if (answer.alternatives.length === 0) {
    const party = partyOf(candidate.terms.partySize).toLowerCase();
    return (
      <>
        <Heading key={answer.lost.key}>
          {`${lost} just went, and nothing in this room replaces them.`}
        </Heading>
        <p className="body">
          The Source answered {age} ago and offered nothing else in this room
          for {party}. This screening is no longer on offer to you: sold out,
          already begun, off sale, without a seat map, or simply short of{" "}
          {party}, and the Source does not say which. seatscout never holds
          seats.
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
        <RoomPlan result={candidate} lost={answer.lost} scale={3} />
      </div>
      <ul className="legend">
        <li>
          <i className="lit" />
          next best
        </li>
        <li>
          <i className="lost" />
          where {labelOf(seatsOf(answer.lost))} were
        </li>
      </ul>
      <p id="next-best" className="eyebrow">
        Next best in this room
      </p>
      <Chips
        alternatives={answer.alternatives}
        candidate={candidate}
        onChoose={onChoose}
      />
      {provenance}
      <div className="cta">
        <Commit
          candidate={candidate}
          phase={phase}
          label={`Take ${spokenOf(seatsOf(candidate))}`}
          onTake={onTake}
        />
        <BackToList />
      </div>
    </>
  );
};

export const Unreached = ({
  candidate,
  at,
  phase,
  now,
  onTake,
}: AnswerProps & { readonly at: number }) => (
  <>
    <Heading key={at}>The Source could not be reached.</Heading>
    <p className="body">
      Nothing was checked, so {spokenOf(seatsOf(candidate))} may well still be
      there. A checkout never opens on an answer that could not be judged.
    </p>
    <Provenance
      line={`Hand-off · ${ageOf(at, now)} ago`}
      note="Nothing was read · nothing was held"
    />
    <div className="cta">
      <Commit
        candidate={candidate}
        phase={phase}
        label="Check again"
        onTake={onTake}
      />
      <BackToList />
    </div>
  </>
);
