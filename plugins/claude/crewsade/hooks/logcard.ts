// The Log pane's cards as SVG, for the desktop: rounded cards, pills and real type
// sizes that Box and Text cannot draw. The desktop shows an Svg as an image, so the
// text is laid out here: measured, wrapped, and placed line by line.

import type { LogRow } from './logic'

export const ROLE_HEX: Record<string, string> = {
  scout: '#3b82f6',
  developer: '#c96442',
  auditor: '#b7791f',
  worker: '#8b5cf6',
}
export const PLAN_HEX = '#6b7280'
export const TONE_HEX: Record<string, string> = {
  success: '#2f855a',
  error: '#c53030',
  warning: '#b7791f',
  subtle: '#6b7280',
}

export const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Thai', 'Leelawadee UI', sans-serif`

// Characters that sit on the one before and take no width: Thai vowels and tone marks
// above and below the line, and Latin combining accents
const ZERO_WIDTH = /[̀-ͯัิ-ฺ็-๎]/
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠\u{1f300}-\u{1faff}]/u

// An estimate of how wide `text` draws at `size` px; close enough to wrap by
export function textWidth(text: string, size: number): number {
  let width = 0
  for (const ch of text) {
    if (ZERO_WIDTH.test(ch)) continue
    if (WIDE.test(ch)) width += size
    else if (ch === ' ') width += size * 0.28
    else if (/[฀-๿]/.test(ch)) width += size * 0.6
    else if (/[A-Z]/.test(ch)) width += size * 0.66
    else if (/[ilj.,'’:;|!]/.test(ch)) width += size * 0.28
    else width += size * 0.55
  }
  return width
}

// Lines of at most `max` px. Breaks at spaces where it can; Thai has no spaces, so
// a run too long for a line breaks between characters. A mark never starts a line:
// it has no width, so adding one can never be what overflows the line.
export function wrap(text: string, max: number, size: number): string[] {
  const lines: string[] = []
  let line = ''
  const push = () => {
    if (line.trim()) lines.push(line.trimEnd())
    line = ''
  }
  for (const word of text.split(/(?<= )/)) {
    if (textWidth(line + word, size) <= max) {
      line += word
      continue
    }
    if (line) push()
    if (textWidth(word, size) <= max) {
      line = word.trimStart()
      continue
    }
    // A run with no room on one line: split it by character
    for (const ch of word) {
      if (line && textWidth(line + ch, size) > max) push()
      line += ch
    }
  }
  push()
  return lines.length ? lines : ['']
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const PAD = 14
const BODY = 13
const DETAIL = 12.5
const LINE = 19

// One log entry as an SVG card `width` px wide, with the height it needs
export function logCard(row: LogRow, width: number): { source: string; height: number } {
  const accent = row.role ? ROLE_HEX[row.role] : PLAN_HEX
  const inner = width - PAD * 2 - 4
  const parts: string[] = []
  let y = PAD + 14

  // Header: icon, who, time; the outcome as a pill on the right
  parts.push(`<text x="${PAD + 4}" y="${y}" class="who" fill="${accent}">${esc(`${row.icon}  ${row.who}`)}</text>`)
  const whoWidth = textWidth(`${row.icon}  ${row.who}`, 13.5) + 10
  parts.push(`<text x="${PAD + 4 + whoWidth}" y="${y}" class="muted">${esc(row.time)}</text>`)
  if (row.outcome) {
    const pillWidth = textWidth(row.outcome.text, 12) + 18
    const x = width - PAD - pillWidth
    parts.push(
      `<rect x="${x}" y="${y - 14}" width="${pillWidth}" height="20" rx="10" fill="${TONE_HEX[row.outcome.tone]}"/>`,
      `<text x="${x + pillWidth / 2}" y="${y}" class="pill" text-anchor="middle">${esc(row.outcome.text)}</text>`,
    )
  }

  // Body: the job, then what it was on
  y += 8
  for (const line of wrap(row.text, inner, BODY)) {
    y += LINE
    parts.push(`<text x="${PAD + 4}" y="${y}" class="body">${esc(line)}</text>`)
  }

  // An audit's FIX titles, one bullet each
  if (row.details.length) y += 6
  for (const detail of row.details) {
    wrap(detail, inner - 14, DETAIL).forEach((line, i) => {
      y += LINE - 1
      if (i === 0) parts.push(`<circle cx="${PAD + 8}" cy="${y - 4}" r="2.5" fill="${TONE_HEX.error}"/>`)
      parts.push(`<text x="${PAD + 18}" y="${y}" class="fix">${esc(line)}</text>`)
    })
  }

  const height = y + PAD
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
  .card { fill: #ffffff; stroke: #e7e5df; }
  .who { font: 600 13.5px ${FONT}; }
  .muted { font: 12px ${FONT}; fill: #8a877f; }
  .body { font: 13px ${FONT}; fill: #2b2a27; }
  .fix { font: ${DETAIL}px ${FONT}; fill: #b42f2f; }
  .pill { font: 600 12px ${FONT}; fill: #ffffff; }
  @media (prefers-color-scheme: dark) {
    .card { fill: #2a2a28; stroke: #3a3936; }
    .muted { fill: #9a978f; }
    .body { fill: #ecebe7; }
    .fix { fill: #f08a8a; }
  }
</style>
<rect class="card" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12"/>
<rect x="0.5" y="12" width="4" height="${height - 24}" rx="2" fill="${accent}"/>
${parts.join('\n')}
</svg>`
  return { source, height }
}
