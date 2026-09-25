import "./results.css";
import type { SeatGroupResult } from "@seatscout/client";
import type { ReactElement } from "react";
import {
  ageOf,
  cardNameOf,
  clockOf,
  designationsOf,
  labelOf,
  notBookableOf,
  ONE_SOURCE,
  roomNameOf,
  whyOf,
} from "@seatscout/view-logic";
import { RoomPlan } from "./room-plan.js";

interface CardProps {
  readonly result: SeatGroupResult;
  readonly now: number;
  readonly online: boolean;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
}

export const Card = ({
  result,
  now,
  online,
  onRoom,
  onHandOff,
}: CardProps): ReactElement => {
  const { theater, formats } = result.showtime.presentation;
  const notBookable = notBookableOf(result);
  const designations = designationsOf(result);
  return (
    <li>
      <article className="card" aria-label={cardNameOf(result)}>
        <RoomPlan result={result} scale={1} />
        <div className="mid">
          <button
            type="button"
            className="open place"
            aria-label={roomNameOf(result)}
            onClick={() => onRoom(result)}
          >
            {theater.name}
            {formats.map((format) => (
              <span key={format} className="fmt">
                {format}
              </span>
            ))}
          </button>
          <p className="why">
            <span>{clockOf(result.showtime.startsAt)}</span>
            {" · "}
            <span>{whyOf(result.reasons, result.podDividers)}</span>
            {notBookable !== null && (
              <span className="warn-note">{` · ${notBookable}`}</span>
            )}
          </p>
          {designations !== null && (
            <p className="designations">{designations}</p>
          )}
        </div>
        <div className="side">
          {online ? (
            <button
              type="button"
              className="seats"
              onClick={() => onHandOff(result)}
            >
              {labelOf(result)}
            </button>
          ) : (
            <span className="seats">{labelOf(result)}</span>
          )}
          <span className="prov">{ONE_SOURCE}</span>
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
