import { writeFileSync } from 'node:fs'
import { DEFAULT_WEIGHTS, angular, reference } from './reference.mjs'
import { ROOMS, load } from './rooms.mjs'

const REFERENCE_ROW = { 'VZ aud 1': 4, 'AMC aud 1': 8, 'ALAM aud 1': 6, 'AFC aud 5': 10, 'CNMK aud 28': 12 }

const shade = (t) => {
  // dark red (worst) through amber to bright green (best); t in 0..1
  const h = 8 + t * 122
  const l = 26 + t * 26
  return `hsl(${h} 72% ${l}%)`
}

function panel(room, label, score, title) {
  const std = room.seats.filter((s) => s.type === 'standard')
  const scored = std.map((s) => ({ ...s, score: score(s, room, DEFAULT_WEIGHTS) }))
  const lo = Math.min(...scored.map((s) => s.score))
  const hi = Math.max(...scored.map((s) => s.score))
  const byId = new Map(scored.map((s) => [s.id, s]))
  const ranked = [...scored].sort((a, b) => b.score - a.score)
  const rankOf = new Map(ranked.map((s, i) => [s.id, i + 1]))

  const w = room.body.backgroundWidth
  const minY = Math.min(...room.seats.map((s) => s.y))
  const maxY = Math.max(...room.seats.map((s) => s.y))
  const pad = (maxY - minY) * 0.12
  const seatW = room.seatWidth

  const refRowY = room.seats.find((s) => s.row === REFERENCE_ROW[label])
  const rects = room.seats
    .map((s) => {
      const hit = byId.get(s.id)
      const fill = hit ? shade((hit.score - lo) / (hi - lo || 1)) : '#3a3a46'
      const rank = rankOf.get(s.id)
      return `<rect x="${s.x - seatW / 2}" y="${s.y - seatW / 2}" width="${seatW * 0.86}" height="${seatW * 0.86}" rx="${seatW * 0.18}" fill="${fill}" ${hit ? '' : 'stroke="#8a8a96" stroke-dasharray="2,2" stroke-width="1"'}><title>${s.id}  row ${s.row}  depth ${s.depth.toFixed(2)}  lateral ${s.lateral.toFixed(2)}  ${hit ? `score ${hit.score.toFixed(3)}  rank ${rank}/${scored.length}` : s.type}</title></rect>`
    })
    .join('')

  const best = ranked[0]
  const marks = `
    <line x1="${room.screenCentreX}" y1="${minY - pad}" x2="${room.screenCentreX}" y2="${maxY + pad}" stroke="#7dd3fc" stroke-width="${seatW * 0.06}" stroke-dasharray="${seatW * 0.3},${seatW * 0.3}" opacity="0.85"/>
    ${refRowY ? `<line x1="0" y1="${refRowY.y}" x2="${w}" y2="${refRowY.y}" stroke="#7dd3fc" stroke-width="${seatW * 0.06}" stroke-dasharray="${seatW * 0.3},${seatW * 0.3}" opacity="0.85"/>` : ''}
    <circle cx="${best.x}" cy="${best.y}" r="${seatW * 0.72}" fill="none" stroke="#ffffff" stroke-width="${seatW * 0.1}"/>
  `
  const screenY = minY - pad * 0.7
  return `
  <figure>
    <figcaption><strong>${label}</strong> ${room.body.theaterName} &middot; ${title}
      <span>best ${best.id} (row ${best.row}, depth ${best.depth.toFixed(2)}, lateral ${best.lateral.toFixed(2)}) &middot; range ${lo.toFixed(2)} to ${hi.toFixed(2)}</span>
    </figcaption>
    <svg viewBox="0 ${minY - pad * 1.6} ${w} ${maxY - minY + pad * 3.2}" preserveAspectRatio="xMidYMid meet">
      <rect x="${w * 0.08}" y="${screenY - seatW * 0.5}" width="${w * 0.84}" height="${seatW * 0.34}" rx="${seatW * 0.17}" fill="#e5e7eb"/>
      <text x="${w / 2}" y="${screenY - seatW * 0.9}" text-anchor="middle" fill="#9ca3af" font-size="${seatW * 0.7}">SCREEN</text>
      ${rects}
      ${marks}
    </svg>
  </figure>`
}

const profiles = [
  ['reference', reference, 'Reference as documented'],
  ['angular', angular, 'lateral penalty as an angle'],
]

const which = process.argv[2] ?? 'reference'
const [, score, title] = profiles.find((p) => p[0] === which)

const html = `<!doctype html><meta charset="utf-8"><title>Reference Seat Profile: ${title}</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; padding:28px; background:#14141b; color:#e8e8ef;
         font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif }
  h1 { font-size:19px; margin:0 0 4px; font-weight:650 }
  p.lede { margin:0 0 22px; color:#a9a9b8; max-width:62ch }
  nav a { color:#7dd3fc; margin-right:14px }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(430px,1fr)); gap:22px }
  figure { margin:0; background:#1c1c25; border:1px solid #2e2e3c; border-radius:12px; padding:14px }
  figcaption { font-size:13px; margin-bottom:10px; line-height:1.45 }
  figcaption span { display:block; color:#a9a9b8; font-size:12px; margin-top:2px }
  svg { width:100%; height:auto; display:block; background:#101017; border-radius:8px }
  .key { display:flex; align-items:center; gap:10px; margin:18px 0 0; color:#a9a9b8; font-size:12px }
  .ramp { width:180px; height:11px; border-radius:6px;
          background:linear-gradient(90deg,hsl(8 72% 26%),hsl(69 72% 39%),hsl(130 72% 52%)) }
</style>
<h1>Reference Seat Profile: ${title}</h1>
<p class="lede">Every Seat drawn at its real x and y, shaded by its rank under the Profile. Dashed blue lines mark the screen centreline and the reference row, two thirds back. The white ring is the top-ranked Seat. Dashed grey squares are wheelchair and companion Seats, which the Profile scores but the product must exclude. Hover any Seat for its score and rank.</p>
<nav>${profiles.map((p) => (p[0] === which ? `<strong>${p[2]}</strong>` : `<a href="./${p[0]}.html">${p[2]}</a>`)).join(' ')}</nav>
<div class="key"><span>worst</span><div class="ramp"></div><span>best</span></div>
<div class="grid">
${ROOMS.map(({ file, label }) => panel(load(file), label, score, title)).join('\n')}
</div>`

writeFileSync(new URL(`./out/${which}.html`, import.meta.url), html)
console.log(`wrote prototype/out/${which}.html`)
