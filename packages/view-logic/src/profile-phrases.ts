export type Weight =
  | "depthWeight"
  | "offAxisWeight"
  | "frontBandWeight"
  | "wallBandWeight"
  | "podDividerWeight";

export interface Scale {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export const WEIGHTS: readonly {
  readonly field: Weight;
  readonly label: string;
}[] = [
  { field: "depthWeight", label: "Missing your spot" },
  { field: "offAxisWeight", label: "Watching at an angle" },
  { field: "frontBandWeight", label: "The front rows" },
  { field: "wallBandWeight", label: "A wall, or the back row" },
  { field: "podDividerWeight", label: "A console between seats" },
];

export const WEIGHT: Scale = { min: 0, max: 2, step: 0.05 };
export const DEPTH: Scale = { min: 0, max: 1, step: 0.01 };
export const LATERAL: Scale = { min: -1, max: 1, step: 0.01 };

export const SITTING = {
  heading: "Where you sit",
  drag: "Drag the dot, or use the two ranges below. The faint circle is Reference, where it was.",
  depth: "How far back",
  depthEnds: ["Front row", "Back row"],
  lateral: "Left or right",
  lateralEnds: ["House left", "House right"],
  reference: "Back to Reference",
  referenceSaid:
    "Reference aims two thirds back on the centreline, where cinema standards tune the room. Saved on this phone once you move it, and sent nowhere. Changing it runs the search again against live availability, because seats are never re-ranked from a reading that has aged.",
  minding: "And what you mind",
  mindEnds: ["Don't mind", "Avoid"],
} as const;

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export const depthOf = (depth: number): string =>
  `${percent(depth)} of the way back`;

export const aimOf = (lateral: number): string =>
  lateral === 0
    ? "on the centreline"
    : `${percent(Math.abs(lateral))} of the way to house ${Math.sign(lateral) === -1 ? "left" : "right"}`;

export const mindOf = (weight: number): string => {
  if (weight === 0) return SITTING.mindEnds[0];
  return weight < 1 ? "A little" : SITTING.mindEnds[1];
};
