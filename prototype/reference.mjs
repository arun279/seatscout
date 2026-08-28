// The Reference Seat Profile exactly as the project documents define it:
//   spec.md      "targets depth 0.67 and lateral 0.0, with penalties for the last row,
//                 the front rows, and lateral angle beyond 15 degrees"
//   CONTEXT.md   "penalises the last row, the front rows, and any Seat whose lateral
//                 viewing angle to the screen centreline exceeds 15 degrees"
// No weights are given anywhere in the corpus of documents, so they are parameters here
// and every conclusion is checked across a sweep of them, never at one setting.

export const TAN15 = Math.tan((15 * Math.PI) / 180)

export const DEFAULT_WEIGHTS = {
  depth: 1,
  lateral: 1,
  frontBand: 0.15,
  frontPenalty: 0.25,
  lastRowPenalty: 0.25,
  anglePenalty: 0.25,
}

// As documented. The 15 degree term lands on normalised lateral at tan(15 deg), because
// that is all the coordinate system affords: no true angle is computable (EXPECTED.md F1).
export function reference(seat, room, w = DEFAULT_WEIGHTS) {
  return (
    1 -
    w.depth * Math.abs(seat.depth - 0.67) -
    w.lateral * Math.abs(seat.lateral) -
    (seat.depth <= w.frontBand ? w.frontPenalty : 0) -
    (seat.row === room.lastRow ? w.lastRowPenalty : 0) -
    (Math.abs(seat.lateral) > TAN15 ? w.anglePenalty : 0)
  )
}

// The candidate replacement. tan(theta) = lateral offset / distance to the screen, both
// in seat widths. `screenGap`, the screen-to-front-row distance, is not measurable from
// this source, so it is a modelled constant and every conclusion is swept over it.
// The lateral term is normalised by TAN15 so that a seat exactly at the comfort limit
// costs the same as `w.lateral`, keeping the weight sweep comparable with `reference`.
export const DEFAULT_SCREEN_GAP = 12

export function angular(seat, room, w = DEFAULT_WEIGHTS, screenGap = DEFAULT_SCREEN_GAP) {
  const tanTheta = Math.abs(seat.lateralW) / (screenGap + seat.depthW)
  return (
    1 -
    w.depth * Math.abs(seat.depth - 0.67) -
    (w.lateral * tanTheta) / TAN15 -
    (seat.depth <= w.frontBand ? w.frontPenalty : 0) -
    (seat.row === room.lastRow ? w.lastRowPenalty : 0) -
    (tanTheta > TAN15 ? w.anglePenalty : 0)
  )
}
