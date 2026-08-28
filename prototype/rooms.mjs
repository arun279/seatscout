import { readFileSync } from 'node:fs'

const dir = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/seatmaps/'

export const ROOMS = [
  { file: 'VZ-aaysq-561443587.json', label: 'VZ aud 1' },
  { file: 'AMC-aaxju-561462741.json', label: 'AMC aud 1' },
  { file: 'ALAM-aayhw-561505814.json', label: 'ALAM aud 1' },
  { file: 'AFC-aapoy-561230736.json', label: 'AFC aud 5' },
  { file: 'CNMK-aacut-561865199.json', label: 'CNMK aud 28' },
]

// EG 18 / Szabo 1986: "Rows should be spaced not less than 30 in. back-to-back with 36 to
// 40 in. preferred" and "Seats should be not less than 19 in. side-to-side, with 20 in.
// preferred". 36/20 is the low end of preferred row spacing over preferred seat width.
export const ROW_PITCH_IN_SEAT_WIDTHS = 36 / 20

const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1]

export function load(file) {
  const { body } = JSON.parse(readFileSync(dir + file, 'utf8'))
  const screenCentreX = body.backgroundWidth / 2
  const seats = body.seats.map((s) => ({
    id: s.id,
    row: s.row,
    type: s.type,
    status: s.status,
    x: body.mapOffsetX + s.x + s.width / 2,
    y: body.mapOffsetY + s.y + s.height / 2,
  }))
  const rowIndices = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b)
  const yOf = new Map()
  for (const r of rowIndices) {
    const ys = seats.filter((s) => s.row === r).map((s) => s.y)
    yOf.set(r, ys.reduce((a, b) => a + b, 0) / ys.length)
  }
  const frontY = yOf.get(rowIndices[0])
  const backY = yOf.get(rowIndices.at(-1))
  const halfWidth = Math.max(...seats.map((s) => Math.abs(s.x - screenCentreX)))
  // Physical units. Column pitch is drawn to scale by every Chain; row pitch is not
  // (Cinemark draws a square lattice), so depth is rescaled from the map's own row
  // spacing into seat widths using the standard row-pitch ratio.
  const seatWidth = median(body.seats.map((s) => s.width))
  const rowGaps = []
  for (let i = 1; i < rowIndices.length; i++) {
    rowGaps.push((yOf.get(rowIndices[i]) - yOf.get(rowIndices[i - 1])) / (rowIndices[i] - rowIndices[i - 1]))
  }
  const rowPitch = median(rowGaps)

  for (const s of seats) {
    s.depth = (yOf.get(s.row) - frontY) / (backY - frontY)
    s.lateral = (s.x - screenCentreX) / halfWidth
    s.lateralW = (s.x - screenCentreX) / seatWidth
    s.depthW = ((yOf.get(s.row) - frontY) / rowPitch) * ROW_PITCH_IN_SEAT_WIDTHS
  }
  return {
    seatWidth,
    rowPitch,
    body,
    seats,
    rowIndices,
    screenCentreX,
    halfWidth,
    lastRow: rowIndices.at(-1),
    aspect: halfWidth / (backY - frontY),
  }
}
