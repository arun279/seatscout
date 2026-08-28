import { ROOMS, load } from './rooms.mjs'
import { DEFAULT_WEIGHTS, angular, reference } from './reference.mjs'

const REFERENCE_ROW = { 'VZ aud 1': 4, 'AMC aud 1': 8, 'ALAM aud 1': 6, 'AFC aud 5': 10, 'CNMK aud 28': 12 }
const ADJACENT = { 'VZ aud 1': [3, 5], 'AMC aud 1': [7, 9], 'ALAM aud 1': [5, 7], 'AFC aud 5': [9, 11], 'CNMK aud 28': [10, 13] }

const standard = (s) => s.type === 'standard'
const centreOf = (rs) => rs.reduce((a, b) => (Math.abs(a.lateral) <= Math.abs(b.lateral) ? a : b))
const outerOf = (rs) => rs.reduce((a, b) => (Math.abs(a.lateral) >= Math.abs(b.lateral) ? a : b))

function evaluate(room, label, score, w) {
  const rows = new Map()
  for (const s of room.seats.filter(standard)) {
    if (!rows.has(s.row)) rows.set(s.row, [])
    rows.get(s.row).push(s)
  }
  const scored = room.seats.filter(standard).map((s) => ({ ...s, score: score(s, room, w) }))
  const rank = [...scored].sort((a, b) => b.score - a.score)
  const at = (id) => scored.find((s) => s.id === id).score

  const firstRow = room.rowIndices[0]
  const lastRow = room.lastRow
  const refRow = REFERENCE_ROW[label]
  const allowed = new Set([refRow, ...ADJACENT[label]])

  const centreFirst = centreOf(rows.get(firstRow))
  const centreLast = centreOf(rows.get(lastRow))
  const centreRef = centreOf(rows.get(refRow))
  const outerFirst = outerOf(rows.get(firstRow))
  const outerLastSameSide = rows
    .get(lastRow)
    .filter((s) => Math.sign(s.lateral) === Math.sign(outerFirst.lateral))
    .reduce((a, b) => (Math.abs(a.lateral) >= Math.abs(b.lateral) ? a : b))

  const topBookable = rank.find((s) => s.status === 'A')
  const nearestTwoIn = (row) =>
    [...rows.get(row)].sort((a, b) => Math.abs(a.lateral) - Math.abs(b.lateral)).slice(0, 2)

  const results = {}
  results.P1 =
    topBookable !== undefined &&
    allowed.has(topBookable.row) &&
    nearestTwoIn(topBookable.row).some((s) => s.id === topBookable.id)
  results.P1geo = allowed.has(rank[0].row) && nearestTwoIn(rank[0].row).some((s) => s.id === rank[0].id)
  results.P2 = at(centreFirst.id) < at(centreRef.id)
  results.P3 = at(centreLast.id) < at(centreRef.id)
  results.P4 = at(centreFirst.id) < at(centreLast.id)
  results.P5 = at(outerFirst.id) < at(outerLastSameSide.id)
  results.P6 = [...rows.values()].every((rs) => {
    const bySide = (sign) =>
      rs.filter((s) => Math.sign(s.lateral) === sign).sort((a, b) => Math.abs(a.lateral) - Math.abs(b.lateral))
    return [-1, 1].every((sign) => {
      const ordered = bySide(sign)
      return ordered.every((s, i) => i === 0 || at(ordered[i - 1].id) >= at(s.id) - 1e-9)
    })
  })
  const singlePeaked = (spine) => {
    const peak = spine.indexOf(Math.max(...spine))
    return (
      room.rowIndices[peak] === refRow &&
      spine.slice(0, peak + 1).every((v, i) => i === 0 || v >= spine[i - 1] - 1e-9) &&
      spine.slice(peak).every((v, i) => i === 0 || v <= spine[peak + i - 1] + 1e-9)
    )
  }
  const spine = room.rowIndices.map((r) => at(centreOf(rows.get(r)).id))
  // The same spine with lateral forced to zero, isolating the depth term from the fact
  // that a row's most central seat is not equally central in every row.
  const idealSpine = room.rowIndices.map((r) =>
    score({ ...centreOf(rows.get(r)), lateral: 0, lateralW: 0 }, room, w),
  )
  results.P7 = singlePeaked(spine)
  results.P7ideal = singlePeaked(idealSpine)

  // The discriminator R2 actually implies: the centre-to-outer gap must be larger in the
  // front row than in the last row, because the same offset is a larger angle nearer the
  // screen. Stated as P5b; see FINDINGS.md on the flawed rationale attached to P5.
  const gapFirst = at(centreFirst.id) - at(outerFirst.id)
  const gapLast = at(centreLast.id) - at(outerLastSameSide.id)
  results.P5b = gapFirst > gapLast + 1e-9
  results._gaps = [gapFirst, gapLast]
  results._top = rank[0]
  results._topBookable = topBookable
  results._spine = spine
  return results
}

const rooms = ROOMS.map(({ file, label }) => ({ label, room: load(file) }))

function sweep(score) {
  const grid = []
  for (const depth of [0.5, 1, 2, 3])
    for (const lateral of [0.25, 0.5, 1, 2])
      for (const frontBand of [0.08, 0.15, 0.25])
        for (const frontPenalty of [0, 0.1, 0.25, 0.5])
          for (const lastRowPenalty of [0, 0.1, 0.25, 0.5])
            for (const anglePenalty of [0, 0.1, 0.25, 0.5])
              grid.push({ depth, lateral, frontBand, frontPenalty, lastRowPenalty, anglePenalty })
  const keys = ['P1', 'P1geo', 'P2', 'P3', 'P4', 'P5', 'P5b', 'P6', 'P7', 'P7ideal']
  const tally = new Map()
  for (const { label, room } of rooms) for (const k of keys) tally.set(`${label}|${k}`, 0)
  for (const w of grid) {
    for (const { label, room } of rooms) {
      const r = evaluate(room, label, score, w)
      for (const k of keys) if (r[k]) tally.set(`${label}|${k}`, tally.get(`${label}|${k}`) + 1)
    }
  }
  console.log(`\ngrid of ${grid.length} weightings; percentage of the grid where each prediction holds\n`)
  console.log(['room'.padEnd(12), ...keys.map((k) => k.padStart(6))].join(' '))
  for (const { label } of rooms) {
    console.log(
      [label.padEnd(12), ...keys.map((k) => `${((tally.get(`${label}|${k}`) / grid.length) * 100).toFixed(0)}%`.padStart(6))].join(' '),
    )
  }
}

const which = process.argv[2] ?? 'reference'
const score = which === 'angular' ? angular : reference
console.log(`### ${which} profile, default weights`, JSON.stringify(DEFAULT_WEIGHTS))
for (const { label, room } of rooms) {
  const r = evaluate(room, label, score, DEFAULT_WEIGHTS)
  console.log(
    `\n${label}  top=${r._top.id} (row ${r._top.row}, lateral ${r._top.lateral.toFixed(3)}, score ${r._top.score.toFixed(3)})` +
      `  topBookable=${r._topBookable?.id ?? 'none'}`,
  )
  console.log(
    '  ',
    ['P1', 'P1geo', 'P2', 'P3', 'P4', 'P5', 'P5b', 'P6', 'P7', 'P7ideal'].map((k) => `${k}=${r[k] ? 'pass' : 'FAIL'}`).join('  '),
  )
  console.log(`   centre-to-outer gap: front row ${r._gaps[0].toFixed(3)}, last row ${r._gaps[1].toFixed(3)}`)
}

// P9: cross room comparability of the top score.
const tops = rooms.map(({ label, room }) => {
  const best = Math.max(...room.seats.filter(standard).map((s) => score(s, room, DEFAULT_WEIGHTS)))
  return { label, best }
})
console.log('\nP9 cross-room top scores:', tops.map((t) => `${t.label}=${t.best.toFixed(3)}`).join('  '))
const vz = tops.find((t) => t.label === 'VZ aud 1').best
const cnmk = tops.find((t) => t.label === 'CNMK aud 28').best
console.log(`   VZ vs CNMK relative difference ${(Math.abs(vz - cnmk) / Math.max(vz, cnmk) * 100).toFixed(1)}% -> P9 ${Math.abs(vz - cnmk) / Math.max(vz, cnmk) < 0.1 ? 'pass' : 'FAIL'}`)

// P10: accessible seats must not surface in the top ranks.
for (const { label, room } of rooms) {
  const all = room.seats.map((s) => ({ ...s, score: score(s, room, DEFAULT_WEIGHTS) })).sort((a, b) => b.score - a.score)
  const worst = all.findIndex((s) => s.type !== 'standard')
  const n = room.seats.filter((s) => s.type !== 'standard').length
  console.log(`P10 ${label.padEnd(12)} ${n} accessible seats; best of them ranks ${worst < 0 ? 'n/a' : worst + 1} of ${all.length}`)
}

sweep(score)
