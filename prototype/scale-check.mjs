import { readdirSync, readFileSync } from 'node:fs'

const dir = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/seatmaps/'

const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1]

const rows = []
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  const { status, body } = JSON.parse(readFileSync(dir + f, 'utf8'))
  if (status !== 200) continue
  const seats = body.seats
  const byRow = new Map()
  for (const s of seats) {
    if (!byRow.has(s.row)) byRow.set(s.row, [])
    byRow.get(s.row).push(s)
  }
  const rowKeys = [...byRow.keys()].sort((a, b) => a - b)

  const colGaps = []
  for (const rs of byRow.values()) {
    const cs = rs.map((s) => s.x + s.width / 2).sort((a, b) => a - b)
    for (let i = 1; i < cs.length; i++) colGaps.push(cs[i] - cs[i - 1])
  }
  const rowYs = rowKeys.map((k) => median(byRow.get(k).map((s) => s.y + s.height / 2)))
  const rowGaps = []
  for (let i = 1; i < rowYs.length; i++) {
    rowGaps.push((rowYs[i] - rowYs[i - 1]) / (rowKeys[i] - rowKeys[i - 1]))
  }

  const seatW = median(seats.map((s) => s.width))
  const colPitch = median(colGaps.filter((g) => g < seatW * 1.6))
  const rowPitch = median(rowGaps)
  rows.push({
    chain: body.chainCode,
    aud: body.auditoriumId,
    seats: seats.length,
    seatW: +seatW.toFixed(1),
    colPitch: +colPitch.toFixed(1),
    rowPitch: +rowPitch.toFixed(1),
    rowOverCol: +(rowPitch / colPitch).toFixed(2),
    screenGapInSeatW: +(body.mapOffsetY / seatW).toFixed(1),
  })
}
rows.sort((a, b) => a.chain.localeCompare(b.chain) || a.rowOverCol - b.rowOverCol)
console.table(rows)

const byChain = new Map()
for (const r of rows) {
  if (!byChain.has(r.chain)) byChain.set(r.chain, [])
  byChain.get(r.chain).push(r)
}
console.log('\nper chain: row-pitch / column-pitch, and screen gap in seat widths')
for (const [chain, rs] of [...byChain].sort()) {
  const ratios = rs.map((r) => r.rowOverCol)
  const gaps = rs.map((r) => r.screenGapInSeatW)
  console.log(
    chain.padEnd(5),
    'n=' + String(rs.length).padStart(2),
    'rowOverCol', Math.min(...ratios).toFixed(2), '-', Math.max(...ratios).toFixed(2),
    '| screenGap', Math.min(...gaps).toFixed(1), '-', Math.max(...gaps).toFixed(1),
  )
}
