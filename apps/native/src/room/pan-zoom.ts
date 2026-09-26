import {
  type Cursor,
  FITTED,
  type Frame,
  mostZoomFor,
  panned,
  revealedIn,
  TOUCH_SLOP,
  type View,
  zoomed,
} from "@seatscout/view-logic";
import { useEffect, useMemo } from "react";
import {
  type ComposedGesture,
  Gesture,
  type PanGestureChangeEventPayload,
  type PinchGestureChangeEventPayload,
  type PinchGestureHandlerEventPayload,
} from "react-native-gesture-handler";
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

export const perUnitOf = (frame: Frame, drawn: Drawn): number =>
  drawn.width / frame.width;

export const pannedBy = (
  view: View,
  moved: PanGestureChangeEventPayload,
  perUnit: number,
  frame: Frame,
): View => {
  "worklet";
  return panned(view, moved.changeX / perUnit, moved.changeY / perUnit, frame);
};

export const zoomedBy = (
  view: View,
  spread: PinchGestureChangeEventPayload &
    Pick<PinchGestureHandlerEventPayload, "focalX" | "focalY">,
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

export const matrixOf = (view: View): number[] => {
  "worklet";
  return [view.scale, 0, 0, view.scale, view.tx, view.ty];
};

export const labelledAt = (view: View, mostZoom: number): number => {
  "worklet";
  return view.scale >= mostZoom ? 1 : 0;
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
          .withTestId("pan")
          .onChange((moved) => {
            view.value = pannedBy(view.value, moved, perUnit, frame);
          }),
        Gesture.Pinch()
          .withTestId("pinch")
          .onChange((spread) => {
            view.value = zoomedBy(view.value, spread, perUnit, frame, mostZoom);
          }),
      ),
    [frame, mostZoom, perUnit, view],
  );

  const drawing = useAnimatedProps(() => ({ matrix: matrixOf(view.value) }));

  const labels = useAnimatedProps(() => ({
    opacity: labelledAt(view.value, mostZoom),
  }));

  const seat = cursor.seat;

  useEffect(() => {
    view.value = revealedIn(view.value, seat, frame);
  }, [frame, seat, view]);

  return { gesture, drawing, labels };
};
