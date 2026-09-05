import type {
  Auditorium,
  PositionedSeat,
  SeatGroupResult,
  SeatRow,
} from "@seatscout/client";
import { type KeyboardEvent, type ReactNode, useMemo } from "react";
import { gridLabelOf, seatNameOf } from "./auditorium-phrases.js";
import { type Frame, usePanZoom } from "./pan-zoom.js";
import { type Cursor, isMove, moved, type Place, placed } from "./traversal.js";

interface SeatMapProps {
  readonly auditorium: Auditorium;
  readonly result: SeatGroupResult;
  readonly candidate: SeatGroupResult;
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

const frameOf = (auditorium: Auditorium): Frame => {
  const seats = auditorium.map.rows.flatMap((row) => row.seats);
  const seatWidth = Math.max(...seats.map((seat) => seat.width));
  const left = Math.min(...seats.map((seat) => seat.x)) - 1.6 * seatWidth;
  const top = Math.min(...seats.map((seat) => seat.y)) - 0.5 * seatWidth;
  return {
    x: left,
    y: top,
    width:
      Math.max(...seats.map((seat) => seat.x + seat.width)) -
      left +
      0.5 * seatWidth,
    height:
      Math.max(...seats.map((seat) => seat.y + seat.height)) -
      top +
      0.5 * seatWidth,
    seatWidth,
  };
};

export const holds = (group: SeatGroupResult, seat: PositionedSeat) =>
  group.seats.some((held) => held.id === seat.id);

const classOf = (seat: PositionedSeat, recommended: boolean, lit: boolean) =>
  [
    "seat",
    seat.bookable ? "bookable" : "unbookable",
    ...(seat.designation === "standard" ? [] : ["space"]),
    ...(recommended ? ["recommended"] : []),
    ...(lit ? ["lit"] : []),
  ].join(" ");

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
        <rect className={`space-ground ${state}`} width="1" height="1" />
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
    {row.gapAfter.flatMap((gap, at) => {
      const left = row.seats[at];
      const right = row.seats[at + 1];
      if (gap !== "pod" || left === undefined || right === undefined) return [];
      const x = (left.x + left.width + right.x) / 2;
      return [
        <line
          key={left.id}
          className="tick"
          x1={x}
          x2={x}
          y1={left.y + 0.2 * left.height}
          y2={left.y + 0.8 * left.height}
        />,
      ];
    })}
    {children}
  </g>
);

export const SeatMap = ({
  auditorium,
  result,
  candidate,
  cursor,
  accessibleSeating,
  onCursor,
  onActivate,
}: SeatMapProps) => {
  const { map } = auditorium;
  const frame = useMemo(() => frameOf(auditorium), [auditorium]);
  const { setGroup, handlers, dragged } = usePanZoom(map, frame, cursor);
  const recommended = result.seats.map((seat) => seat.id);
  const offered = useMemo(
    () =>
      new Set(
        auditorium.offered.flatMap((group) =>
          group.seats.map((seat) => seat.id),
        ),
      ),
    [auditorium],
  );

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
    if (cursor.row !== place.row || cursor.seat !== place.seat)
      onCursor(placed(map, place));
  };

  const tapped = (place: Place) => {
    if (dragged()) return;
    onCursor(placed(map, place));
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
          {map.rows.map((row, rowAt) => (
            <Row key={row.ordinalFromFront} row={row} frame={frame}>
              {row.seats.map((seat, seatIndex) => {
                const place = { row: rowAt, seat: seatIndex };
                const roving =
                  cursor.row === rowAt && cursor.seat === seatIndex;
                return (
                  <rect
                    key={seat.id}
                    role="gridcell"
                    className={classOf(
                      seat,
                      holds(result, seat),
                      holds(candidate, seat),
                    )}
                    tabIndex={roving ? 0 : -1}
                    aria-label={seatNameOf(
                      seat,
                      recommended,
                      accessibleSeating,
                    )}
                    aria-selected={holds(candidate, seat)}
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
