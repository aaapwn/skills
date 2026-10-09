import { describe, expect, test } from 'claude-code/testing'

import { parsePlan, tasksModel, type Crew } from './logic'
import { tasksSvg } from './taskscard'

const PLAN = `# Mission: Demo <slugify> & co
Status: in-progress
Done when: slugify works

## Sub-tasks
| # | Sub-task | Agent | Status | Failed rounds |
| --- | --- | --- | --- | --- |
| 1 | เขียน slugify พร้อมเทส | developer | done | 2 |
| 2 | รองรับภาษาไทย | developer | auditing | 1 |
| 3 | เอกสาร | worker | todo | 0 |
`

const auditor: Crew = { role: 'auditor', verb: 'ตรวจงานที่ developer แก้มา', subject: 'x', startedAt: 0, isRunning: true }

describe('tasksSvg', () => {
  test('escapes the mission title', async () => {
    const svg = tasksSvg(tasksModel(parsePlan(PLAN), [], 0)!, 320).source
    expect(svg.includes('Demo &lt;slugify&gt; &amp; co')).toBe(true)
  })

  test('the sub-task in hand shows its stage, failed rounds and a crew card', async () => {
    const svg = tasksSvg(tasksModel(parsePlan(PLAN), [auditor], 12_000)!, 320).source
    expect(svg.includes('>กำลังตรวจ<')).toBe(true)
    expect(svg.includes('ตรวจไม่ผ่านไปแล้ว 1 รอบ')).toBe(true)
    expect(svg.includes('ตรวจงานที่ developer แก้มา')).toBe(true)
    expect(svg.match(/class="crew"/g)?.length).toBe(1)
  })

  test('a done sub-task shows who built it, its audits and time from the log; a waiting one says so', async () => {
    const tasks = tasksModel(parsePlan(PLAN), [], 0)!
    const svg = tasksSvg(tasks, 360, { 'เขียน slugify พร้อมเทส': { maker: 'developer', audits: 3, minutes: 6 } }).source
    expect(svg.includes('developer · ตรวจ 3 รอบ · 6 นาที')).toBe(true)
    expect(svg.includes('>ยังไม่เริ่ม<')).toBe(true)
    expect(svg.includes('>รอ<')).toBe(true)
  })

  test('the bar has one segment per sub-task, and the timeline links each pair', async () => {
    const svg = tasksSvg(tasksModel(parsePlan(PLAN), [], 0)!, 320).source
    expect(svg.match(/height="6" rx="3"/g)?.length).toBe(3)
    expect(svg.match(/class="link"/g)?.length).toBe(2)
  })

  test('the drawing does not change as time passes, only when the work does', async () => {
    const tasks = (now: number) => tasksModel(parsePlan(PLAN), [auditor], now)!
    expect(tasksSvg(tasks(1_000), 320).source).toBe(tasksSvg(tasks(95_000), 320).source)
  })

  test('a working agent makes the drawing taller', async () => {
    const idle = tasksSvg(tasksModel(parsePlan(PLAN), [], 0)!, 320)
    const busy = tasksSvg(tasksModel(parsePlan(PLAN), [auditor], 0)!, 320)
    expect(busy.height > idle.height).toBe(true)
  })

  test('segments take the colour of their sub-task, and an empty bar has none', async () => {
    const coloured = (text: string) => (tasksSvg(tasksModel(parsePlan(text), [], 0)!, 320).source.match(/height="6" rx="3" fill="/g) ?? []).length
    expect(coloured(PLAN)).toBe(2)
    expect(coloured(PLAN.replace('| done | 2 |', '| todo | 0 |').replace('| auditing | 1 |', '| todo | 0 |'))).toBe(0)
  })
})
