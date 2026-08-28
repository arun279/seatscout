import { readdirSync, readFileSync } from 'node:fs'

const dir = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/seatmaps/'

const rows = []
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  const { status, body } = JSON.parse(readFileSync(dir + f, 'utf8'))
  if (status !== 200) continue
  const seats = body.seats
  const cx = (s) => body.mapOffsetX + s.x + s.width / 2
  const xs = seats.map(cx)
  const blockCentre = (Math.min(...xs) + Math.max(...xs)) / 2
  const bgCentre = body.backgroundWidth / 2
  const seatW = seats[0].width
  const screenRect = body.backgroundSvg.match(/class="Screen"[^>]*>\s*<rect[^>]*x="([\d.]+)"[^>]*width="([\d.]+)"/)
  rows.push({
    file: f,
    chain: body.chainCode,
    bgW: body.backgroundWidth,
    blockCentre: +blockCentre.toFixed(1),
    bgCentre,
    offsetSeatWidths: +((blockCentre - bgCentre) / seatW).toFixed(2),
    screenRect: screenRect ? `${screenRect[1]}..${+screenRect[1] + +screenRect[2]}` : '',
  })
}
rows.sort((a, b) => Math.abs(b.offsetSeatWidths) - Math.abs(a.offsetSeatWidths))
console.table(rows)
