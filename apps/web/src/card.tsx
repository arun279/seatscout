import type { SeatGroupResult } from "@seatscout/client";
import { ageOf, clockOf, whyOf } from "./phrases.js";
import { RoomPlan } from "./room-plan.js";

interface CardProps {
  readonly result: SeatGroupResult;
  readonly now: number;
}

export const Card = ({ result, now }: CardProps) => {
  const { theater, formats } = result.showtime.presentation;
  const clock = clockOf(result.showtime.startsAt);
  return (
    <li>
      <article
        className="card"
        aria-label={[theater.name, clock, ...formats].join(", ")}
      >
        <RoomPlan result={result} />
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
          <span className="seats">
            {result.seats.map((seat) => seat.id).join("·")}
          </span>
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
