// The crisp invariant, stated at equal offset rather than at each row's own edge.
// At the same lateral offset in seat widths, a Seat in the front row must be penalised
// more than one in the last row, because the same offset is a larger angle nearer the
// screen. A separable score cannot satisfy this; an angular one always does.
import { readdirSync, readFileSync } from 'node:fs'
import { DEFAULT_WEIGHTS, angular, reference } from './reference.mjs'
import { load } from './rooms.mjs'

const dir = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/seatmaps/'
const maps = readdirSync(dir).filter((n) => n.endsWith('.json') && JSON.parse(readFileSync(dir + n, 'utf8')).status === 200)

function holds(room, score, arg) {
  const std = room.seats.filter((s) => s.type === 'standard')
  const first = std.filter((s) => s.row === room.rowIndices[0])
  const last = std.filter((s) => s.row === room.lastRow)
  if (!first.length || !last.length) return null
  const reach = Math.min(
    Math.max(...first.map((s) => Math.abs(s.lateralW))),
    Math.max(...last.map((s) => Math.abs(s.lateralW))),
  )
  if (reach <= 0) return null
  // Evaluate the score at exactly the same offset in both rows, so nothing but the form
  // of the expression can decide the comparison.
  const at = (rs, offsetW) => {
    const seat = rs[0]
    return score(
      { ...seat, lateralW: offsetW, lateral: (offsetW * room.seatWidth) / room.halfWidth },
      room,
      DEFAULT_WEIGHTS,
      arg,
    )
  }
  return at(first, 0) - at(first, reach) > at(last, 0) - at(last, reach) + 1e-9
}

const tally = (score, arg) => maps.filter((f) => holds(load(f), score, arg) === true).length

console.log('At equal lateral offset, is the penalty larger in the front row than the last?')
console.log('over all', maps.length, 'captured maps\n')
console.log('  reference (separable)          ', tally(reference), 'of', maps.length)
for (const gap of [6, 9, 12, 16, 20, 24, 32, 48]) {
  console.log(`  angular, screen gap ${String(gap).padStart(2)} seat widths`.padEnd(34), tally(angular, gap), 'of', maps.length)
}
