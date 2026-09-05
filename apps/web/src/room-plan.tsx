import { REFERENCE, type SeatGroupResult } from "@seatscout/client";
import { marksOf } from "./plan.js";

export const RoomPlan = ({ result }: { readonly result: SeatGroupResult }) => {
  const marks = marksOf(
    result.plan,
    result.position,
    result.terms.profile ?? REFERENCE,
  );
  return (
    <svg
      className="plan"
      viewBox="0 0 64 46"
      width="64"
      height="46"
      aria-hidden="true"
    >
      <line x1="14" y1="2.5" x2="50" y2="2.5" className="mp-screen" />
      {marks.rows.map((row) => (
        <line
          key={`${row.y}:${row.x1}`}
          x1={row.x1}
          y1={row.y}
          x2={row.x2}
          y2={row.y}
          className="mp-row"
        />
      ))}
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
