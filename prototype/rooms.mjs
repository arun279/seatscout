import { readFileSync } from 'node:fs'

const dir = '/Users/parallels/Documents/projects/scratchpad/movie-tickets/work/mvp/fixtures/corpus/seatmaps/'

export const ROOMS = [
  { file: 'VZ-aaysq-561443587.json', label: 'VZ aud 1' },
  { file: 'AMC-aaxju-561462741.json', label: 'AMC aud 1' },
  { file: 'ALAM-aayhw-561505814.json', label: 'ALAM aud 1' },
  { file: 'AFC-aapoy-561230736.json', label: 'AFC aud 5' },
  { file: 'CNMK-aacut-561865199.json', label: 'CNMK aud 28' },
]

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
  for (const s of seats) {
    s.depth = (yOf.get(s.row) - frontY) / (backY - frontY)
    s.lateral = (s.x - screenCentreX) / halfWidth
  }
  return { body, seats, rowIndices, screenCentreX, halfWidth }
}
