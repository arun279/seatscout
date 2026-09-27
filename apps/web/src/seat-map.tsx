import "./seat-map.css";
import type { Auditorium, SeatGroupResult, SeatRow } from "@seatscout/client";
import type { ReactElement } from "react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import {
  type Cursor,
  dividersIn,
  type Frame,
  frameOf,
  gridLabelOf,
  holds,
  isMove,
  moved,
  offeredIn,
  type Place,
  placed,
  seatNameOf,
  stateOf,
} from "@seatscout/view-logic";
import { usePanZoom } from "./pan-zoom.js";

interface SeatMapProps {
  readonly auditorium: Auditorium;
  readonly result: SeatGroupResult;
  readonly chosen: SeatGroupResult;
  readonly cursor: Cursor;
  readonly accessibleSeating: boolean;
  readonly onCursor: (cursor: Cursor) => void;
  readonly onActivate: (place: Place) => void;
}

interface RowProps {
  readonly row: SeatRow;
  readonly frame: Frame;
  readonly children: ReactNode;
}

const Spaces = () => (
  <defs>
    {["bookable", "unbookable", "lit"].map((state) => (
      <pattern
        key={state}
        id={`space-${state}`}
        patternUnits="objectBoundingBox"
        patternContentUnits="objectBoundingBox"
        width="1"
        height="1"
      >
        <rect
          className="space-ground"
          data-state={state}
          width="1"
          height="1"
        />
        <circle className="space-dot" cx="0.5" cy="0.5" r="0.16" />
      </pattern>
    ))}
  </defs>
);

const Row = ({ row, frame, children }: RowProps) => (
  <g role="row" aria-rowindex={row.ordinalFromFront}>
    {row.label !== null && (
      <text
        role="rowheader"
        className="row-label"
        x={frame.x + 1.2 * frame.seatWidth}
        y={
          Math.min(...row.seats.map((seat) => seat.y)) +
          Math.max(...row.seats.map((seat) => seat.height)) / 2
        }
        fontSize={0.7 * frame.seatWidth}
      >
        {row.label}
      </text>
    )}
    {dividersIn(row).map((divider) => (
      <line
        key={divider.x}
        className="tick"
        x1={divider.x}
        x2={divider.x}
        y1={divider.y1}
        y2={divider.y2}
      />
    ))}
    {children}
  </g>
);

export const SeatMap = ({
  auditorium,
  result,
  chosen,
  cursor,
  accessibleSeating,
  onCursor,
  onActivate,
}: SeatMapProps): ReactElement => {
  const { map } = auditorium;
  const [{ frame, offered }] = useState(() => ({
    frame: frameOf(auditorium),
    offered: offeredIn(auditorium),
  }));
  const { setGroup, handlers, dragged } = usePanZoom(frame, cursor);
  const recommended = result.seats.map((seat) => seat.id);

  const keyed = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate(cursor);
      return;
    }
    if (!isMove(event.key)) return;
    event.preventDefault();
    onCursor(moved(map, cursor, event.key, event.ctrlKey));
  };

  const focusedOn = (place: Place) => {
    if (cursor.seat !== place.seat) onCursor(placed(place));
  };

  const tapped = (place: Place) => {
    if (dragged()) return;
    onCursor(placed(place));
    onActivate(place);
  };

  return (
    <svg
      className="seat-map"
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      role="grid"
      aria-label={gridLabelOf(auditorium, result)}
      aria-rowcount={map.rows.length}
      onKeyDown={keyed}
    >
      <Spaces />
      <g ref={setGroup} {...handlers}>
        <g transform={`translate(${-frame.x} ${-frame.y})`}>
          <rect
            className="ground"
            x={frame.x}
            y={frame.y}
            width={frame.width}
            height={frame.height}
          />
          {map.rows.map((row) => (
            <Row key={row.ordinalFromFront} row={row} frame={frame}>
              {row.seats.map((seat) => {
                const place = { row, seat };
                const roving = cursor.seat === seat;
                const lit = holds(chosen, seat);
                return (
                  <rect
                    key={seat.id}
                    role="gridcell"
                    className="seat"
                    data-state={stateOf(seat, lit)}
                    data-designation={seat.designation}
                    data-recommended={holds(result, seat)}
                    tabIndex={roving ? 0 : -1}
                    aria-label={seatNameOf(
                      seat,
                      recommended,
                      accessibleSeating,
                    )}
                    aria-selected={lit}
                    aria-disabled={offered.has(seat.id) ? undefined : true}
                    data-seat={seat.id}
                    x={seat.x}
                    y={seat.y}
                    width={seat.width}
                    height={seat.height}
                    rx={seat.width * 0.18}
                    onFocus={() => focusedOn(place)}
                    onClick={() => tapped(place)}
                  />
                );
              })}
            </Row>
          ))}
        </g>
      </g>
    </svg>
  );
};
