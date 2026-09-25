import {
  type Box,
  type Cursor,
  FITTED,
  type Frame,
  mostZoomFor,
  panned,
  revealed,
  type View,
  zoomed,
} from "@seatscout/view-logic";
import { useEffect, useMemo } from "react";
import { type ComposedGesture, Gesture } from "react-native-gesture-handler";
import { useAnimatedProps, useSharedValue } from "react-native-reanimated";
import type { GProps } from "react-native-svg";
import { TOUCH_FLOOR } from "../design-system/touch.js";

export interface Drawn {
  readonly width: number;
  readonly height: number;
}

export interface PanZoom {
  readonly gesture: ComposedGesture;
  readonly drawing: Partial<GProps>;
  readonly labels: Partial<GProps>;
}

const TOUCH_SLOP = 8;

export const perUnitOf = (frame: Frame, drawn: Drawn): number =>
  drawn.width / frame.width;

export const pannedBy = (
  view: View,
  moved: { readonly changeX: number; readonly changeY: number },
  perUnit: number,
  frame: Frame,
): View => {
  "worklet";
  return panned(view, moved.changeX / perUnit, moved.changeY / perUnit, frame);
};

export const zoomedBy = (
  view: View,
  spread: {
    readonly scaleChange: number;
    readonly focalX: number;
    readonly focalY: number;
  },
  perUnit: number,
  frame: Frame,
  mostZoom: number,
): View => {
  "worklet";
  return zoomed(
    view,
    spread.scaleChange,
    { x: spread.focalX / perUnit, y: spread.focalY / perUnit },
    frame,
    mostZoom,
  );
};

export const revealedIn = (view: View, seat: Box, frame: Frame): View =>
  revealed(view, { ...seat, x: seat.x - frame.x, y: seat.y - frame.y }, frame);

export const matrixOf = (view: View): number[] => {
  "worklet";
  return [view.scale, 0, 0, view.scale, view.tx, view.ty];
};

export const labelledAt = (
  view: View,
  frame: Frame,
  perUnit: number,
  floor: number,
): number => {
  "worklet";
  return view.scale * frame.seatWidth * perUnit >= floor ? 1 : 0;
};

export const usePanZoom = (
  frame: Frame,
  drawn: Drawn,
  cursor: Cursor,
): PanZoom => {
  const view = useSharedValue<View>(FITTED);
  const perUnit = perUnitOf(frame, drawn);
  const mostZoom = mostZoomFor(
    frame.seatWidth,
    frame.width,
    drawn.width,
    TOUCH_FLOOR,
  );

  const gesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Pan()
          .maxPointers(2)
          .averageTouches(true)
          .minDistance(TOUCH_SLOP)
          .onChange((moved) => {
            view.value = pannedBy(view.value, moved, perUnit, frame);
          }),
        Gesture.Pinch().onChange((spread) => {
          view.value = zoomedBy(view.value, spread, perUnit, frame, mostZoom);
        }),
      ),
    [frame, mostZoom, perUnit, view],
  );

  const drawing = useAnimatedProps(() => ({ matrix: matrixOf(view.value) }));

  const labels = useAnimatedProps(() => ({
    opacity: labelledAt(view.value, frame, perUnit, TOUCH_FLOOR),
  }));

  const seat = cursor.seat;

  useEffect(() => {
    view.value = revealedIn(view.value, seat, frame);
  }, [frame, seat, view]);

  return { gesture, drawing, labels };
};
