// The Tasks pane as one SVG for the desktop:
//   a header card (label, count, title, a bar with one segment per sub-task),
//   the goal in its own box, and the sub-tasks as a connected timeline, each with a
//   status pill on the right and a second line from the log (who, audits, time).

import { FONT, ROLE_HEX, TONE_HEX, esc, textWidth, wrap } from './logcard'
import { ICON, clock, duration, type Step, type SubTaskStats, type Tasks } from './logic'

const STAGE_HEX: Record<string, string> = {
  กำลังทำ: '#c96442',
  กำลังตรวจ: '#b7791f',
  ติดอยู่: '#c53030',
}
const STEP_HEX: Record<Step, string> = {
  done: TONE_HEX.success,
  current: '#d69e2e',
  blocked: TONE_HEX.error,
  todo: '',
}

const PAD = 4
const NODE_X = PAD + 13 // centre of the timeline nodes
const TEXT_X = PAD + 34 // where a step's text starts

// A soft pill: tinted ground, coloured text; returns its markup and width
function pill(x: number, y: number, label: string, color: string | null): { svg: string; width: number } {
  const width = textWidth(label, 12) + 20
  const svg = color
    ? `<rect x="${x}" y="${y}" width="${width}" height="22" rx="11" fill="${color}" fill-opacity="0.14"/>` +
      `<text x="${x + width / 2}" y="${y + 15}" class="pill" fill="${color}" text-anchor="middle">${esc(label)}</text>`
    : `<rect x="${x + 0.5}" y="${y + 0.5}" width="${width - 1}" height="21" rx="10.5" class="pill-wait"/>` +
      `<text x="${x + width / 2}" y="${y + 15}" class="pill wait" text-anchor="middle">${esc(label)}</text>`
  return { svg, width }
}

// The whole pane `width` px wide, with the height it needs. `stats` holds each
// sub-task's history from the log, by title.
export function tasksSvg(tasks: Tasks, width: number, stats: Record<string, SubTaskStats> = {}): { source: string; height: number } {
  const inner = width - PAD * 2
  const parts: string[] = []

  // ---- Header card ----
  let y = PAD
  const head: string[] = []
  let hy = y + 24
  head.push(`<text x="${PAD + 16}" y="${hy}" class="label">MISSION</text>`)
  const count = `${tasks.done} / ${tasks.total} งาน`
  head.push(`<text x="${width - PAD - 16}" y="${hy}" class="count" text-anchor="end">${esc(count)}</text>`)
  for (const line of wrap(tasks.title, inner - 32, 17)) {
    hy += 25
    head.push(`<text x="${PAD + 16}" y="${hy}" class="title">${esc(line)}</text>`)
  }
  // One segment per sub-task, coloured by its state
  hy += 16
  const gap = 4
  const n = Math.max(1, tasks.rows.length)
  const seg = (inner - 32 - gap * (n - 1)) / n
  tasks.rows.forEach((row, i) => {
    const x = PAD + 16 + i * (seg + gap)
    head.push(
      row.step === 'todo'
        ? `<rect x="${x}" y="${hy}" width="${seg}" height="6" rx="3" class="seg-empty"/>`
        : `<rect x="${x}" y="${hy}" width="${seg}" height="6" rx="3" fill="${STEP_HEX[row.step]}"/>`,
    )
  })
  hy += 6 + 16
  parts.push(`<rect x="${PAD}" y="${y}" width="${inner}" height="${hy - y}" rx="14" class="head"/>`, ...head)
  y = hy

  // ---- Goal ----
  if (tasks.doneWhen) {
    y += 14
    const goalTop = y
    const lines = wrap(tasks.doneWhen, inner - 44, 13)
    lines.forEach((line, i) => {
      y += 19
      parts.push(`<text x="${PAD + (i === 0 ? 16 : 37)}" y="${y}" class="goal">${esc(i === 0 ? `🎯  ${line}` : line)}</text>`)
    })
    parts.push(`<rect x="${PAD}" y="${goalTop + 3}" width="3" height="${y - goalTop + 2}" rx="1.5" class="goal-bar"/>`)
  }

  // ---- Timeline ----
  y += 22
  const nodes: number[] = []
  for (const row of tasks.rows) {
    const s = stats[row.title]
    const isActive = row.step === 'current' || row.step === 'blocked'
    const top = y
    const label = isActive ? row.stage || 'กำลังทำ' : row.step === 'done' ? 'เสร็จ' : 'รอ'
    const color = isActive ? (STAGE_HEX[row.stage] ?? STEP_HEX[row.step]) : row.step === 'done' ? TONE_HEX.success : null
    const p = pill(0, 0, label, color)

    // Title, wrapped to leave room for the pill
    const titleLines = wrap(`${row.id}. ${row.title}`, inner - (TEXT_X - PAD) - p.width - 12, 13.5)
    let ty = y + 16
    titleLines.forEach((line, i) => {
      if (i > 0) ty += 19
      parts.push(`<text x="${TEXT_X}" y="${ty}" class="${row.step === 'todo' ? 'step-todo' : 'step'}">${esc(line)}</text>`)
    })
    parts.push(pill(width - PAD - p.width, y, label, color).svg)
    nodes.push(y + 11)

    // Second line(s)
    let sy = ty
    const sub = (text: string, cls = 'sub') => {
      for (const line of wrap(text, inner - (TEXT_X - PAD), 12.5)) {
        sy += 19
        parts.push(`<text x="${TEXT_X}" y="${sy}" class="${cls}">${esc(line)}</text>`)
      }
    }
    if (row.step === 'done') {
      const bits = [
        s?.maker ? `${ICON[s.maker]} ${s.maker}` : null,
        s && s.audits > 0 ? `ตรวจ ${s.audits} รอบ` : null,
        s && s.minutes !== null ? duration(s.minutes) : null,
      ].filter(Boolean)
      if (bits.length) sub(bits.join(' · '))
      else if (row.failed > 0) sub(`ไม่ผ่าน ${row.failed} รอบ`)
    } else if (row.step === 'todo') {
      sub('ยังไม่เริ่ม', 'sub-faint')
    } else {
      if (row.failed > 0) sub(`ตรวจไม่ผ่านไปแล้ว ${row.failed} รอบ`, 'sub-error')
      // The crew on it: a soft card per agent, with a pulsing dot
      for (const member of row.crew) {
        sy += 12
        const cardTop = sy
        const color2 = ROLE_HEX[member.role] ?? TONE_HEX.subtle
        const who = `${ICON[member.role]} ${member.role}`
        sy += 22
        const job = wrap(member.job, inner - (TEXT_X - PAD) - 28, 13)
        const card = [
          `<circle cx="${TEXT_X + 14}" cy="${sy - 4.5}" r="4" fill="${color2}" class="pulse"/>`,
          `<text x="${TEXT_X + 26}" y="${sy}" class="who" fill="${color2}">${esc(who)}</text>`,
          // A start time, not a ticking count: the drawing then only changes when the work does
          `<text x="${width - PAD - 12}" y="${sy}" class="sub" text-anchor="end">${esc(`เริ่ม ${clock(member.startedAt)}`)}</text>`,
        ]
        for (const line of job) {
          sy += 19
          card.push(`<text x="${TEXT_X + 26}" y="${sy}" class="body">${esc(line)}</text>`)
        }
        sy += 12
        parts.push(`<rect x="${TEXT_X}" y="${cardTop}" width="${width - PAD - TEXT_X}" height="${sy - cardTop}" rx="10" class="crew"/>`, ...card)
      }
    }

    // Node on the timeline
    const cy = top + 11
    if (row.step === 'done') {
      parts.push(
        `<circle cx="${NODE_X}" cy="${cy}" r="9" fill="${TONE_HEX.success}"/>`,
        `<path d="M${NODE_X - 4} ${cy} l2.8 2.8 l5.2 -5.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
    } else if (row.step === 'todo') {
      parts.push(`<circle cx="${NODE_X}" cy="${cy}" r="8" class="node-todo"/>`)
    } else {
      const c = STEP_HEX[row.step]
      parts.push(
        `<circle cx="${NODE_X}" cy="${cy}" r="9" fill="${c}" fill-opacity="0.18"/>`,
        `<circle cx="${NODE_X}" cy="${cy}" r="4.5" fill="${c}" class="pulse"/>`,
      )
    }
    y = Math.max(sy, ty) + 26
  }

  // Lines joining the nodes, drawn under them
  const links = nodes
    .slice(1)
    .map((to, i) => `<line x1="${NODE_X}" y1="${nodes[i] + 12}" x2="${NODE_X}" y2="${to - 12}" class="link"/>`)

  const height = Math.ceil(y - 10)
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
  .head { fill: #f5f3ee; }
  .label { font: 600 10.5px ${FONT}; letter-spacing: 1.2px; fill: #9a968c; }
  .count { font: 600 12.5px ${FONT}; fill: #5f5c55; }
  .title { font: 650 17px ${FONT}; fill: #1f1e1c; }
  .seg-empty { fill: #e3e0d8; }
  .goal { font: 13px ${FONT}; fill: #5f5c55; }
  .goal-bar { fill: #d8d4ca; }
  .step { font: 600 13.5px ${FONT}; fill: #1f1e1c; }
  .step-todo { font: 600 13.5px ${FONT}; fill: #a29f97; }
  .sub { font: 12.5px ${FONT}; fill: #8a877f; }
  .sub-faint { font: 12.5px ${FONT}; fill: #b5b2aa; }
  .sub-error { font: 12.5px ${FONT}; fill: #c53030; }
  .body { font: 13px ${FONT}; fill: #2b2a27; }
  .who { font: 600 13px ${FONT}; }
  .pill { font: 600 12px ${FONT}; }
  .pill.wait { fill: #9a968c; }
  .pill-wait { fill: none; stroke: #d8d4ca; }
  .crew { fill: #f8f6f2; stroke: #ebe8e1; }
  .node-todo { fill: #ffffff; stroke: #cfcbc1; stroke-width: 1.8; }
  .link { stroke: #e3e0d8; stroke-width: 2; stroke-linecap: round; }
  .pulse { animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @media (prefers-color-scheme: dark) {
    .head { fill: #2c2b28; }
    .count, .goal { fill: #b9b6ae; }
    .title, .step { fill: #f1f0ec; }
    .seg-empty, .link { fill: #3d3c38; stroke: #3d3c38; }
    .goal-bar { fill: #4a4844; }
    .step-todo, .sub-faint { fill: #6f6c66; }
    .sub { fill: #9a978f; }
    .sub-error { fill: #f08a8a; }
    .body { fill: #ecebe7; }
    .pill-wait { stroke: #4a4844; }
    .crew { fill: #262523; stroke: #383733; }
    .node-todo { fill: #1f1e1c; stroke: #5a5853; }
  }
</style>
${links.join('\n')}
${parts.join('\n')}
</svg>`
  return { source, height }
}
