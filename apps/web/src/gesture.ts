export interface View {
  readonly k: number;
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

const TAP_TARGET = 44;

export const FITTED: View = { k: 1, tx: 0, ty: 0 };

const clamped = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const bounded = (view: View, extent: Extent): View => ({
  k: view.k,
  tx: clamped(view.tx, extent.width * (1 - view.k), 0),
  ty: clamped(view.ty, extent.height * (1 - view.k), 0),
});

export const panned = (view: View, dx: number, dy: number, extent: Extent) =>
  bounded({ ...view, tx: view.tx + dx, ty: view.ty + dy }, extent);

export const zoomed = (
  view: View,
  factor: number,
  about: Point,
  extent: Extent,
  mostZoom: number,
): View => {
  const k = clamped(view.k * factor, 1, mostZoom);
  const grown = k / view.k;
  return bounded(
    {
      k,
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

const shiftInto = (low: number, high: number, limit: number) =>
  low < 0 ? -low : Math.min(0, limit - high);

export const revealed = (view: View, seat: Box, extent: Extent): View => {
  const left = view.tx + view.k * seat.x;
  const top = view.ty + view.k * seat.y;
  return panned(
    view,
    shiftInto(left, left + view.k * seat.width, extent.width),
    shiftInto(top, top + view.k * seat.height, extent.height),
    extent,
  );
};

export const mostZoomFor = (
  seatWidth: number,
  extentWidth: number,
  clientWidth: number,
) => Math.max(1, TAP_TARGET / ((seatWidth * clientWidth) / extentWidth));

export const transformOf = (view: View) =>
  `translate(${view.tx} ${view.ty}) scale(${view.k})`;
