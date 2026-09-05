import type { SeatGroupResult } from "@seatscout/client";
import { seatsOf } from "./derived.js";
import { ageOf, clockOf, labelOf, whyOf } from "./phrases.js";
import { RoomPlan } from "./room-plan.js";

interface CardProps {
  readonly result: SeatGroupResult;
  readonly now: number;
  readonly online: boolean;
  readonly onHandOff: (result: SeatGroupResult) => void;
}

export const Card = ({ result, now, online, onHandOff }: CardProps) => {
  const { theater, formats } = result.showtime.presentation;
  const clock = clockOf(result.showtime.startsAt);
  return (
    <li>
      <article
        className="card"
        aria-label={[theater.name, clock, ...formats].join(", ")}
      >
        <RoomPlan result={result} scale={1} />
        <div className="mid">
          <p className="place">
            {theater.name}
            {formats.map((format) => (
              <span key={format} className="fmt">
                {format}
              </span>
            ))}
          </p>
          <p className="why">
            <span>{clock}</span>
            {" · "}
            <span>{whyOf(result.reasons, result.podDividers)}</span>
            {result.removed.unavailable > 0 && (
              <span className="warn-note">
                {` · ${result.removed.unavailable} of ${result.seatCount} not bookable`}
              </span>
            )}
          </p>
        </div>
        <div className="side">
          {online ? (
            <button
              type="button"
              className="seats"
              onClick={() => onHandOff(result)}
            >
              {labelOf(seatsOf(result))}
            </button>
          ) : (
            <span className="seats">{labelOf(seatsOf(result))}</span>
          )}
          <span className="prov">1 source</span>
          <time
            className="age"
            dateTime={new Date(result.fetchedAt).toISOString()}
          >
            {ageOf(result.fetchedAt, now)}
          </time>
        </div>
      </article>
    </li>
  );
};
