// Two questions the five-room check cannot answer.
//   1. Is the angular form's conclusion robust to the one constant it cannot measure?
//   2. Does either form's top score depend on room size, which would bias the
//      cross-Auditorium ranking the product performs?
import { readdirSync, readFileSync } from 'node:fs'
import { DEFAULT_WEIGHTS, angular, reference } from './reference.mjs'
import { load } from './rooms.mjs'

const dir = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/seatmaps/'
const files = readdirSync(dir).filter((n) => {
  if (!n.endsWith('.json')) return false
  return JSON.parse(readFileSync(dir + n, 'utf8')).status === 200
})

const standard = (s) => s.type === 'standard'
const centreOf = (rs) => rs.reduce((a, b) => (Math.abs(a.lateral) <= Math.abs(b.lateral) ? a : b))
const outerOf = (rs) => rs.reduce((a, b) => (Math.abs(a.lateral) >= Math.abs(b.lateral) ? a : b))

function gapTest(room, score, arg) {
  const rowsOf = (r) => room.seats.filter((s) => s.row === r && standard(s))
  const first = rowsOf(room.rowIndices[0])
  const last = rowsOf(room.lastRow)
  if (!first.length || !last.length) return null
  const of = (s) => score(s, room, DEFAULT_WEIGHTS, arg)
  const oF = outerOf(first)
  const oL = last
    .filter((s) => Math.sign(s.lateral) === Math.sign(oF.lateral))
    .reduce((a, b) => (Math.abs(a.lateral) >= Math.abs(b.lateral) ? a : b), last[0])
  return of(centreOf(first)) - of(oF) > of(centreOf(last)) - of(oL)
}

console.log('P5b (the centre-to-outer penalty is larger in the front row than the last row)')
console.log('over all 42 captured maps\n')
console.log('  reference profile:'.padEnd(28), `${files.filter((f) => gapTest(load(f), reference) === true).length} of ${files.length}`)
for (const gap of [6, 9, 12, 16, 20, 24, 32]) {
  const pass = files.filter((f) => gapTest(load(f), angular, gap) === true).length
  console.log(`  angular, screenGap ${String(gap).padStart(2)} seat widths:`.padEnd(40), `${pass} of ${files.length}`)
}

console.log('\nTop score by room size (cross-Auditorium comparability)\n')
const rows = files.map((f) => {
  const room = load(f)
  const std = room.seats.filter(standard)
  return {
    chain: room.body.chainCode,
    rows: room.rowIndices.length,
    seats: room.seats.length,
    reference: +Math.max(...std.map((s) => reference(s, room, DEFAULT_WEIGHTS))).toFixed(3),
    angular: +Math.max(...std.map((s) => angular(s, room, DEFAULT_WEIGHTS))).toFixed(3),
  }
})
rows.sort((a, b) => a.rows - b.rows)
console.table(rows)

const corr = (xs, ys) => {
  const mx = xs.reduce((a, b) => a + b) / xs.length
  const my = ys.reduce((a, b) => a + b) / ys.length
  const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0)
  const den = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0))
  return num / den
}
const rowCounts = rows.map((r) => r.rows)
console.log('correlation of top score with row count:')
console.log('  reference', corr(rowCounts, rows.map((r) => r.reference)).toFixed(3))
console.log('  angular  ', corr(rowCounts, rows.map((r) => r.angular)).toFixed(3))
const small = rows.filter((r) => r.rows <= 7)
const large = rows.filter((r) => r.rows >= 11)
console.log(`  rooms with <=7 rows (n=${small.length}) mean top score, reference ${(small.reduce((a, r) => a + r.reference, 0) / small.length).toFixed(3)}`)
console.log(`  rooms with >=11 rows (n=${large.length}) mean top score, reference ${(large.reduce((a, r) => a + r.reference, 0) / large.length).toFixed(3)}`)
