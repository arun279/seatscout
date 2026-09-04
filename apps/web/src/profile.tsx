import { isReference, REFERENCE, type SeatProfile } from "@seatscout/client";
import { type PointerEvent, useId } from "react";
import { dotAt, rowsOf, targetAt } from "./plan.js";

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
  readonly ends: readonly [string, string];
  readonly span: Span;
  readonly value: number;
  readonly text?: string;
  readonly term?: string;
  readonly onChange: (value: number) => void;
}

type Weight =
  | "depthWeight"
  | "offAxisWeight"
  | "frontBandWeight"
  | "wallBandWeight"
  | "podDividerWeight";

const WEIGHTS: readonly { readonly field: Weight; readonly label: string }[] = [
  { field: "depthWeight", label: "Rows away from your target" },
  { field: "offAxisWeight", label: "Off to the side" },
  { field: "frontBandWeight", label: "The front rows" },
  { field: "wallBandWeight", label: "Against a wall" },
  { field: "podDividerWeight", label: "A console between you" },
];

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

const lateralText = (lateral: number) =>
  lateral === 0
    ? "on the centreline"
    : `${percent(Math.abs(lateral))} of the way to house ${Math.sign(lateral) === -1 ? "left" : "right"}`;

const Room = ({ profile, onChange }: ProfileProps) => {
  const place = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      ...profile,
      ...targetAt(
        (event.clientX - box.left) / box.width,
        (event.clientY - box.top) / box.height,
      ),
    });
  };
  const mark = dotAt(profile.targetLateral, profile.targetDepth);
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
      {rowsOf(ROOM).map((row) => (
        <line
          key={row.y}
          x1={row.x1}
          y1={row.y}
          x2={row.x2}
          y2={row.y}
          className="mp-row"
        />
      ))}
      <circle cx={mark.cx} cy={mark.cy} r="4.5" className="mp-target" />
      <circle cx={mark.cx} cy={mark.cy} r="3" className="mp-pair" />
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
      <label className="eyebrow" htmlFor={id}>
        {label}
      </label>
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
      <span className="ends" aria-hidden="true">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </span>
    </div>
  );
};

export const Profile = ({ profile, onChange }: ProfileProps) => (
  <>
    <fieldset className="field">
      <legend className="eyebrow">Where you sit</legend>
      <Room profile={profile} onChange={onChange} />
      <Range
        label="How far back"
        ends={["Front", "Back"]}
        span={DEPTH}
        value={profile.targetDepth}
        text={depthText(profile.targetDepth)}
        term="profile"
        onChange={(targetDepth) => onChange({ ...profile, targetDepth })}
      />
      <Range
        label="Left or right"
        ends={["Left", "Right"]}
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
        Reference sits two thirds back on the centreline, where the standards
        tune the room. Change it and this phone remembers.
      </p>
    </fieldset>
    <fieldset className="field">
      <legend className="eyebrow">What to avoid</legend>
      {WEIGHTS.map(({ field, label }) => (
        <Range
          key={field}
          label={label}
          ends={["Don't mind", "Avoid"]}
          span={WEIGHT}
          value={profile[field]}
          onChange={(weight) => onChange({ ...profile, [field]: weight })}
        />
      ))}
    </fieldset>
  </>
);
