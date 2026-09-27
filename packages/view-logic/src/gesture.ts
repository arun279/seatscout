export interface View {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

export interface Extent {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box extends Point, Extent {}

type Pair = readonly [Point, Point];

export const FITTED: View = { scale: 1, tx: 0, ty: 0 };

export const TOUCH_SLOP = 8;

const clamped = (value: number, low: number, high: number) => {
  "worklet";
  return Math.min(high, Math.max(low, value));
};

const bounded = (view: View, extent: Extent): View => {
  "worklet";
  return {
    scale: view.scale,
    tx: clamped(view.tx, extent.width * (1 - view.scale), 0),
    ty: clamped(view.ty, extent.height * (1 - view.scale), 0),
  };
};

export const panned = (
  view: View,
  dx: number,
  dy: number,
  extent: Extent,
): View => {
  "worklet";
  return bounded({ ...view, tx: view.tx + dx, ty: view.ty + dy }, extent);
};

export const zoomed = (
  view: View,
  factor: number,
  about: Point,
  extent: Extent,
  mostZoom: number,
): View => {
  "worklet";
  const scale = clamped(view.scale * factor, 1, mostZoom);
  const grown = scale / view.scale;
  return bounded(
    {
      scale,
      tx: about.x - (about.x - view.tx) * grown,
      ty: about.y - (about.y - view.ty) * grown,
    },
    extent,
  );
};

const midOf = ([first, second]: Pair): Point => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const spanOf = ([first, second]: Pair) =>
  Math.hypot(first.x - second.x, first.y - second.y);

export const pinched = (
  view: View,
  previous: Pair,
  current: Pair,
  extent: Extent,
  mostZoom: number,
): View => {
  const from = midOf(previous);
  const to = midOf(current);
  return zoomed(
    panned(view, to.x - from.x, to.y - from.y, extent),
    spanOf(current) / spanOf(previous),
    to,
    extent,
    mostZoom,
  );
};

const shiftInto = (low: number, high: number, limit: number) => {
  "worklet";
  return low < 0 ? -low : Math.min(0, limit - high);
};

export const revealed = (view: View, seat: Box, extent: Extent): View => {
  "worklet";
  const left = view.tx + view.scale * seat.x;
  const top = view.ty + view.scale * seat.y;
  return panned(
    view,
    shiftInto(left, left + view.scale * seat.width, extent.width),
    shiftInto(top, top + view.scale * seat.height, extent.height),
    extent,
  );
};

export const revealedIn = (view: View, seat: Box, frame: Box): View =>
  revealed(view, { ...seat, x: seat.x - frame.x, y: seat.y - frame.y }, frame);

export const mostZoomFor = (
  seatWidth: number,
  extentWidth: number,
  clientWidth: number,
  floor: number,
): number => Math.max(1, floor / ((seatWidth * clientWidth) / extentWidth));

export const transformOf = (view: View): string =>
  `translate(${view.tx} ${view.ty}) scale(${view.scale})`;
