import { readFileSync } from 'node:fs'

const base = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/'

for (const f of process.argv.slice(2)) {
  const body = JSON.parse(readFileSync(base + 'seatmaps/' + f, 'utf8'))
  const seats = body.seats ?? body.body?.seats ?? body.seatMap?.seats
  const cx = (s) => s.x + s.width / 2
  const cy = (s) => s.y + s.height / 2
  const xs = seats.map(cx)
  const ys = seats.map(cy)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  console.log('====', f, 'seats', seats.length)
  console.log(
    'x', minX.toFixed(1), maxX.toFixed(1),
    'y', minY.toFixed(1), maxY.toFixed(1),
    'width/depth', ((maxX - minX) / (maxY - minY)).toFixed(2),
  )
  const byRow = new Map()
  for (const s of seats) {
    if (!byRow.has(s.row)) byRow.set(s.row, [])
    byRow.get(s.row).push(s)
  }
  const W = 78
  for (const [row, rs] of [...byRow.entries()].sort((a, b) => a - b)) {
    rs.sort((a, b) => cx(a) - cx(b))
    const line = Array(W + 1).fill(' ')
    for (const s of rs) {
      const col = Math.round(((cx(s) - minX) / (maxX - minX || 1)) * W)
      line[col] =
        s.type === 'wheelchair' ? 'W' : s.type === 'companion' ? 'c' : s.status === 'A' ? '.' : 'x'
    }
    const yMin = Math.min(...rs.map(cy))
    const yMax = Math.max(...rs.map(cy))
    console.log(
      String(row).padStart(2),
      String(rs[0].id).padEnd(6),
      line.join(''),
      `| n=${String(rs.length).padStart(2)}`,
      `y ${yMin.toFixed(0)}${yMax !== yMin ? `-${yMax.toFixed(0)}` : ''}`,
    )
  }
}
