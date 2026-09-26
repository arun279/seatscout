import "./house.css";
import "./ask.css";
import { isReference, REFERENCE, type SeatProfile } from "@seatscout/client";
import type { ReactElement } from "react";
import { type PointerEvent, useId } from "react";
import {
  aimAt,
  aimOf,
  DEPTH,
  depthOf,
  LATERAL,
  marksOf,
  mindOf,
  type Scale,
  SEAT_PICKER,
  SITTING,
  type Term,
  WEIGHT,
  WEIGHTS,
} from "@seatscout/view-logic";

interface ProfileProps {
  readonly profile: SeatProfile;
  readonly onChange: (profile: SeatProfile) => void;
}

interface RangeProps {
  readonly label: string;
  readonly ends?: readonly [string, string];
  readonly span: Scale;
  readonly value: number;
  readonly text?: string;
  readonly term?: Term;
  readonly onChange: (value: number) => void;
}

const WIDTH = 64;
const HEIGHT = 46;

const SeatPicker = ({ profile, onChange }: ProfileProps) => {
  const place = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      ...profile,
      ...aimAt({
        cx: ((event.clientX - box.left) / box.width) * WIDTH,
        cy: ((event.clientY - box.top) / box.height) * HEIGHT,
      }),
    });
  };
  const sitting = {
    depth: profile.targetDepth,
    lateral: profile.targetLateral,
    seatsOffCentre: 0,
  };
  const was = marksOf(SEAT_PICKER, sitting, REFERENCE);
  const marks = marksOf(SEAT_PICKER, sitting, profile);
  return (
    <svg
      className="seat-picker"
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
      <label className="name" htmlFor={id}>
        {label}
      </label>{" "}
      <output className="said" htmlFor={id} aria-hidden="true">
        {text}
      </output>
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

export const Profile = ({ profile, onChange }: ProfileProps): ReactElement => (
  <>
    <fieldset className="field">
      <legend className="eyebrow">{SITTING.heading}</legend>
      <SeatPicker profile={profile} onChange={onChange} />
      <p className="micro">{SITTING.drag}</p>
      <Range
        label={SITTING.depth}
        ends={SITTING.depthEnds}
        span={DEPTH}
        value={profile.targetDepth}
        text={depthOf(profile.targetDepth)}
        term="profile"
        onChange={(targetDepth) => onChange({ ...profile, targetDepth })}
      />
      <Range
        label={SITTING.lateral}
        ends={SITTING.lateralEnds}
        span={LATERAL}
        value={profile.targetLateral}
        text={aimOf(profile.targetLateral)}
        onChange={(targetLateral) => onChange({ ...profile, targetLateral })}
      />
      <button
        type="button"
        className="chip"
        disabled={isReference(profile)}
        onClick={() => onChange(REFERENCE)}
      >
        {SITTING.reference}
      </button>
      <p className="micro">{SITTING.referenceNote}</p>
    </fieldset>
    <fieldset className="field">
      <legend className="eyebrow">{SITTING.minding}</legend>
      {WEIGHTS.map(({ field, label }) => (
        <Range
          key={field}
          label={label}
          span={WEIGHT}
          value={profile[field]}
          text={mindOf(profile[field])}
          onChange={(weight) => onChange({ ...profile, [field]: weight })}
        />
      ))}
      <span className="ends" aria-hidden="true">
        <span>{SITTING.mindEnds[0]}</span>
        <span>{SITTING.mindEnds[1]}</span>
      </span>
    </fieldset>
  </>
);
