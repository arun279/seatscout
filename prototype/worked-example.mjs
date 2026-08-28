// The disagreement, in degrees, for the seats named in FINDINGS.md.
import { DEFAULT_SCREEN_GAP, DEFAULT_WEIGHTS, angular, reference } from './reference.mjs'
import { ROOMS, load } from './rooms.mjs'

const deg = (t) => `${((Math.atan(t) * 180) / Math.PI).toFixed(1)}°`

for (const { file, label } of ROOMS) {
  const room = load(file)
  const std = room.seats.filter((s) => s.type === 'standard')
  const rank = (score) => {
    const sorted = [...std].sort((a, b) => score(b, room, DEFAULT_WEIGHTS) - score(a, room, DEFAULT_WEIGHTS))
    return new Map(sorted.map((s, i) => [s.id, i + 1]))
  }
  const rRef = rank(reference)
  const rAng = rank(angular)
  const outerOf = (row) =>
    std.filter((s) => s.row === row).reduce((a, b) => (Math.abs(a.lateral) >= Math.abs(b.lateral) ? a : b))
  const a = outerOf(room.rowIndices[0])
  const b = outerOf(room.lastRow)
  const same = Math.sign(a.lateral) === Math.sign(b.lateral)
  const bSide = same
    ? b
    : std
        .filter((s) => s.row === room.lastRow && Math.sign(s.lateral) === Math.sign(a.lateral))
        .reduce((x, y) => (Math.abs(x.lateral) >= Math.abs(y.lateral) ? x : y))

  console.log(`\n${label}  (${std.length} standard seats, screen gap modelled at ${DEFAULT_SCREEN_GAP} seat widths)`)
  for (const s of [a, bSide]) {
    const t = Math.abs(s.lateralW) / (DEFAULT_SCREEN_GAP + s.depthW)
    console.log(
      `  ${s.id.padEnd(5)} row ${String(s.row).padStart(2)}  ` +
        `${Math.abs(s.lateralW).toFixed(1).padStart(5)} seat widths off centre, ` +
        `${(DEFAULT_SCREEN_GAP + s.depthW).toFixed(1).padStart(5)} from the screen  ->  off axis ${deg(t).padStart(6)}   ` +
        `Reference rank ${String(rRef.get(s.id)).padStart(3)}/${std.length}   angular rank ${String(rAng.get(s.id)).padStart(3)}/${std.length}`,
    )
  }
}
