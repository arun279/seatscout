import type { AuditoriumMap, PositionedSeat } from "@seatscout/client";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import {
  type Box,
  FITTED,
  mostZoomFor,
  panned,
  pinched,
  type Point,
  revealed,
  transformOf,
  type View,
  zoomed,
} from "./gesture.js";
import { type Cursor, seatAt } from "./traversal.js";

export interface Frame extends Box {
  readonly seatWidth: number;
}

interface Tracked extends Point {
  readonly from: Point;
}

const TOUCH_SLOP = 8;
const WHEEL_TRAVEL_PER_DOUBLING = 240;

const boxOf = (seat: PositionedSeat, frame: Frame): Box => ({
  x: seat.x - frame.x,
  y: seat.y - frame.y,
  width: seat.width,
  height: seat.height,
});

const measured = (target: SVGGElement, frame: Frame, view: View) => {
  const bounds = target.getBoundingClientRect();
  const perUnit = bounds.width / (frame.width * view.scale);
  return {
    perUnit,
    mostZoom: mostZoomFor(
      frame.seatWidth,
      frame.width,
      bounds.width / view.scale,
    ),
    inView: (client: Point): Point => ({
      x: (client.x - bounds.left) / perUnit + view.tx,
      y: (client.y - bounds.top) / perUnit + view.ty,
    }),
  };
};

export const usePanZoom = (
  map: AuditoriumMap,
  frame: Frame,
  cursor: Cursor,
) => {
  const [group, setGroup] = useState<SVGGElement | null>(null);
  const view = useRef<View>(FITTED);
  const pointers = useRef(new Map<number, Tracked>());
  const dragged = useRef(false);

  useEffect(() => {
    if (group === null) return;
    for (const cell of group.querySelectorAll<SVGElement>(
      '[role="gridcell"][tabindex="0"]',
    ))
      cell.focus({ preventScroll: true });
    view.current = revealed(
      view.current,
      boxOf(seatAt(map, cursor), frame),
      frame,
    );
    group.setAttribute("transform", transformOf(view.current));
  }, [group, cursor, map, frame]);

  useEffect(() => {
    if (group === null) return;
    const wheeled = (event: WheelEvent) => {
      event.preventDefault();
      const { inView, mostZoom } = measured(group, frame, view.current);
      view.current = zoomed(
        view.current,
        2 ** (-event.deltaY / WHEEL_TRAVEL_PER_DOUBLING),
        inView({ x: event.clientX, y: event.clientY }),
        frame,
        mostZoom,
      );
      group.setAttribute("transform", transformOf(view.current));
    };
    group.addEventListener("wheel", wheeled, { passive: false });
    return () => group.removeEventListener("wheel", wheeled);
  }, [group, frame]);

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    event.preventDefault();
    const at = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, { ...at, from: at });
    dragged.current = false;
  };

  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    const before = pointers.current.get(event.pointerId);
    if (before === undefined) return;
    const at = { x: event.clientX, y: event.clientY, from: before.from };
    pointers.current.set(event.pointerId, at);
    dragged.current =
      dragged.current ||
      Math.hypot(at.x - at.from.x, at.y - at.from.y) > TOUCH_SLOP;
    if (!dragged.current) return;
    const { perUnit, mostZoom, inView } = measured(
      event.currentTarget,
      frame,
      view.current,
    );
    const [other] = [...pointers.current.values()].filter(
      (held) => held !== at,
    );
    view.current =
      other === undefined
        ? panned(
            view.current,
            (at.x - before.x) / perUnit,
            (at.y - before.y) / perUnit,
            frame,
          )
        : pinched(
            view.current,
            [inView(before), inView(other)],
            [inView(at), inView(other)],
            frame,
            mostZoom,
          );
    event.currentTarget.setAttribute("transform", transformOf(view.current));
  };

  const onPointerUp = (event: PointerEvent<SVGGElement>) => {
    pointers.current.delete(event.pointerId);
  };

  return {
    setGroup,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    dragged: () => dragged.current,
  };
};
