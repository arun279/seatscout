import { ROOMS, load } from './rooms.mjs'

for (const { file, label } of ROOMS) {
  const { body, seats, rowIndices, screenCentreX } = load(file)
  console.log(`\n=== ${label}  ${body.theaterName}  (${seats.length} seats, ${rowIndices.length} rows)`)
  console.log('screen centreline x =', screenCentreX)
  console.log('row  label   n  depth   rowMidX-centre  nearestToCentre  |lateral| of that seat')
  for (const r of rowIndices) {
    const rs = seats.filter((s) => s.row === r).sort((a, b) => a.x - b.x)
    const midX = (rs[0].x + rs.at(-1).x) / 2
    const nearest = rs.reduce((a, b) => (Math.abs(a.lateral) <= Math.abs(b.lateral) ? a : b))
    console.log(
      String(r).padStart(3),
      String(rs[0].id).padEnd(6),
      String(rs.length).padStart(3),
      rs[0].depth.toFixed(3).padStart(6),
      (midX - screenCentreX).toFixed(1).padStart(9),
      String(nearest.id).padStart(10),
      nearest.lateral.toFixed(3).padStart(8),
      rs.some((s) => s.type !== 'standard') ? ' (has accessible seating)' : '',
    )
  }
}
