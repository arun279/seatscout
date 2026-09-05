import { isReference, REFERENCE, type SeatProfile } from "@seatscout/client";
import { type PointerEvent, useId } from "react";
import { marksOf, targetAt } from "./plan.js";
import type { Term } from "./title-card-terms.js";

interface ProfileProps {
  readonly profile: SeatProfile;
  readonly onChange: (profile: SeatProfile) => void;
}

interface Span {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

interface RangeProps {
  readonly label: string;
  readonly ends?: readonly [string, string];
  readonly span: Span;
  readonly value: number;
  readonly text?: string;
  readonly term?: Term;
  readonly onChange: (value: number) => void;
}

type Weight =
  | "depthWeight"
  | "offAxisWeight"
  | "frontBandWeight"
  | "wallBandWeight"
  | "podDividerWeight";

const WEIGHTS: readonly { readonly field: Weight; readonly label: string }[] = [
  { field: "depthWeight", label: "Missing your spot" },
  { field: "offAxisWeight", label: "Watching at an angle" },
  { field: "frontBandWeight", label: "The front rows" },
  { field: "wallBandWeight", label: "A wall, or the back row" },
  { field: "podDividerWeight", label: "A console between seats" },
];

const REFERENCE_AT = {
  depth: REFERENCE.targetDepth,
  lateral: REFERENCE.targetLateral,
  seatsOffCentre: 0,
};

const WIDTH = 64;
const HEIGHT = 46;

const WEIGHT: Span = { min: 0, max: 2, step: 0.05 };
const DEPTH: Span = { min: 0, max: 1, step: 0.01 };
const LATERAL: Span = { min: -1, max: 1, step: 0.01 };
const ROWS = 10;

const ROOM = Array.from({ length: ROWS }, (_, row) => {
  const reach = 0.66 + (0.34 * row) / (ROWS - 1);
  return { depth: row / (ROWS - 1), runs: [{ from: -reach, to: reach }] };
});

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

const depthText = (depth: number) => `${percent(depth)} of the way back`;

const mindText = (weight: number) => {
  if (weight === 0) return "Don't mind";
  return weight < 1 ? "A little" : "Avoid";
};

const lateralText = (lateral: number) =>
  lateral === 0
    ? "on the centreline"
    : `${percent(Math.abs(lateral))} of the way to house ${Math.sign(lateral) === -1 ? "left" : "right"}`;

const held = (value: number, low: number, high: number) =>
  Math.round(Math.min(high, Math.max(low, value)) * 100) / 100;

const Room = ({ profile, onChange }: ProfileProps) => {
  const place = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = targetAt({
      cx: ((event.clientX - box.left) / box.width) * WIDTH,
      cy: ((event.clientY - box.top) / box.height) * HEIGHT,
    });
    onChange({
      ...profile,
      targetDepth: held(at.targetDepth, 0, 1),
      targetLateral: held(at.targetLateral, -1, 1),
    });
  };
  const was = marksOf(ROOM, REFERENCE_AT, REFERENCE);
  const marks = marksOf(
    ROOM,
    {
      depth: profile.targetDepth,
      lateral: profile.targetLateral,
      seatsOffCentre: 0,
    },
    profile,
  );
  return (
    <svg
      className="room"
      viewBox="0 0 64 46"
      aria-hidden="true"
      onPointerDown={place}
      onPointerMove={(event) => {
        if (event.buttons !== 0) place(event);
      }}
    >
      <line x1="14" y1="2.5" x2="50" y2="2.5" className="mp-screen" />
      {marks.rows.map((row) => (
        <line
          key={row.y}
          x1={row.x1}
          y1={row.y}
          x2={row.x2}
          y2={row.y}
          className="mp-row"
        />
      ))}
      {isReference(profile) ? null : (
        <circle
          cx={was.target.cx}
          cy={was.target.cy}
          r="2"
          className="mp-was"
        />
      )}
      <circle
        cx={marks.target.cx}
        cy={marks.target.cy}
        r="4.5"
        className="mp-target"
      />
      <circle cx={marks.pair.cx} cy={marks.pair.cy} r="3" className="mp-pair" />
    </svg>
  );
};

const Range = ({
  label,
  ends,
  span,
  value,
  text,
  term,
  onChange,
}: RangeProps) => {
  const id = useId();
  return (
    <div className="field range">
      <span className="top">
        <label className="name" htmlFor={id}>
          {label}
        </label>
        <span className="said" aria-hidden="true">
          {text}
        </span>
      </span>
      <input
        id={id}
        type="range"
        className="slider"
        min={span.min}
        max={span.max}
        step={span.step}
        value={value}
        aria-valuetext={text}
        data-term={term}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {ends === undefined ? null : (
        <span className="ends" aria-hidden="true">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      )}
    </div>
  );
};

export const Profile = ({ profile, onChange }: ProfileProps) => (
  <>
    <fieldset className="field">
      <legend className="eyebrow">Where you sit</legend>
      <Room profile={profile} onChange={onChange} />
      <p className="micro">
        Drag the dot, or use the two ranges below. The faint circle is
        Reference, where it was.
      </p>
      <Range
        label="How far back"
        ends={["Front row", "Back row"]}
        span={DEPTH}
        value={profile.targetDepth}
        text={depthText(profile.targetDepth)}
        term="profile"
        onChange={(targetDepth) => onChange({ ...profile, targetDepth })}
      />
      <Range
        label="Left or right"
        ends={["House left", "House right"]}
        span={LATERAL}
        value={profile.targetLateral}
        text={lateralText(profile.targetLateral)}
        onChange={(targetLateral) => onChange({ ...profile, targetLateral })}
      />
      <button
        type="button"
        className="chip"
        disabled={isReference(profile)}
        onClick={() => onChange(REFERENCE)}
      >
        Back to Reference
      </button>
      <p className="micro">
        Reference aims two thirds back on the centreline, where cinema standards
        tune the room. Saved on this phone once you move it, and sent nowhere.
        Changing it runs the search again against live availability, because
        seats are never re-ranked from a reading that has aged.
      </p>
    </fieldset>
    <fieldset className="field">
      <legend className="eyebrow">And what you mind</legend>
      {WEIGHTS.map(({ field, label }) => (
        <Range
          key={field}
          label={label}
          span={WEIGHT}
          value={profile[field]}
          text={mindText(profile[field])}
          onChange={(weight) => onChange({ ...profile, [field]: weight })}
        />
      ))}
      <span className="ends" aria-hidden="true">
        <span>Don't mind</span>
        <span>Avoid</span>
      </span>
    </fieldset>
  </>
);
