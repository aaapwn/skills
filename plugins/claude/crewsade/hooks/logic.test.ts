import { describe, expect, test } from 'claude-code/testing'

import {
  bandModel,
  followUp,
  logRows,
  parseDescription,
  parseReport,
  planEvents,
  subTaskStats,
  duration,
  tasksModel,
  type LogEntry,
  parsePlan,
  roleOf,
  type Crew,
} from './logic'

// The shape references/plan-template.md gives the foreman
const PLAN = `# Mission: Payment client migration
Status: in-progress
Started: 2026-10-09
Done when: every payment endpoint uses the new client

## Requirement
LMP-1234

## Sub-tasks
| # | Sub-task | Agent | Status | Failed rounds |
| --- | --- | --- | --- | --- |
| 1 | ย้าย refund endpoint | developer | done | 0 |
| 2 | ย้าย capture endpoint | developer | auditing | 1 |
| 3 | ลบ client เก่า | developer | todo | 0 |
| 4 | อัปเดตเอกสาร | worker | todo | 0 |

Status: todo · in-progress · auditing · done · blocked

### 1. ย้าย refund endpoint
`

const member = (over: Partial<Crew>): Crew => ({
  role: 'developer',
  verb: 'เขียนโค้ด',
  subject: 'ย้าย capture endpoint',
  startedAt: 0,
  isRunning: true,
  ...over,
})

describe('parsePlan', () => {
  test('reads the title, status and sub-task table', async () => {
    const plan = parsePlan(PLAN)
    expect(plan?.title).toBe('Payment client migration')
    expect(plan?.status).toBe('in-progress')
    expect(plan?.subTasks.map(t => t.status)).toEqual(['done', 'auditing', 'todo', 'todo'])
    expect(plan?.subTasks[1].failed).toBe(1)
  })

  test('stops at the table and skips template placeholders', async () => {
    const plan = parsePlan(`# Mission: x\nStatus: planning\n\n## Sub-tasks\n| # | Sub-task | Agent | Status | Failed rounds |\n| --- | --- | --- | --- | --- |\n| 1 | <…> | developer | todo | 0 |\n`)
    expect(plan?.subTasks).toEqual([])
  })

  test('is null without a mission line', async () => {
    expect(parsePlan('just notes')).toBe(null)
  })
})

describe('roleOf and parseDescription', () => {
  test('knows only crewsade agents', async () => {
    expect(roleOf('crewsade:auditor')).toBe('auditor')
    expect(roleOf('general-purpose')).toBe(null)
  })

  test('splits role · verb · subject', async () => {
    expect(parseDescription('auditor', 'auditor · รีวิวโค้ด · ย้าย capture endpoint')).toEqual({
      verb: 'รีวิวโค้ด',
      subject: 'ย้าย capture endpoint',
    })
  })

  test('falls back to the role default for a free-form description', async () => {
    expect(parseDescription('scout', 'Survey payment module')).toEqual({ verb: 'สำรวจ', subject: 'Survey payment module' })
  })
})

describe('followUp', () => {
  test('a summary shaped like a description is the agent\'s new job', async () => {
    expect(followUp(member({}), 'developer · แก้ตามผลตรวจ (2 ข้อ) · ย้าย capture endpoint')).toEqual({
      verb: 'แก้ตามผลตรวจ (2 ข้อ)',
      subject: 'ย้าย capture endpoint',
    })
  })

  test('any other summary, or none, keeps the job it had', async () => {
    const kept = { verb: 'เขียนโค้ด', subject: 'ย้าย capture endpoint' }
    expect(followUp(member({}), 'answer the scout question')).toEqual(kept)
    expect(followUp(member({}), undefined)).toEqual(kept)
  })

  test('three parts are not enough: the first must be the agent\'s own role', async () => {
    const kept = { verb: 'เขียนโค้ด', subject: 'ย้าย capture endpoint' }
    expect(followUp(member({ role: 'developer' }), 'done · tests pass · next')).toEqual(kept)
    expect(followUp(member({ role: 'developer' }), 'auditor · ตรวจซ้ำ · X')).toEqual(kept)
  })
})

describe('bandModel', () => {
  const plan = parsePlan(PLAN)

  test('names the sub-task it is on, its stage and failed rounds, and the progress', async () => {
    const band = bandModel(plan, [], 0)
    expect(band?.title).toBe('Payment client migration')
    expect([band?.done, band?.total]).toEqual([1, 4])
    expect(band?.current).toEqual({ title: 'ย้าย capture endpoint', isNext: false, stage: 'กำลังตรวจ', failed: 1 })
    expect(band?.alert).toBe(null)
  })

  test('between sub-tasks it names the next one, but not while still planning', async () => {
    const between = parsePlan(PLAN.replace('| auditing | 1 |', '| done | 1 |'))
    expect(bandModel(between, [], 0)?.current).toEqual({ title: 'ลบ client เก่า', isNext: true, stage: '', failed: 0 })
    const planned = parsePlan(PLAN.replace('Status: in-progress', 'Status: planning').replace('| auditing | 1 |', '| todo | 0 |'))
    expect(bandModel(planned, [], 0)?.current).toBe(null)
  })

  test('a working agent shows the job it was given, with elapsed time', async () => {
    const band = bandModel(plan, [member({ role: 'auditor', verb: 'ตรวจงานที่ developer แก้มา' })], 80_000)
    expect(band?.crew).toEqual([
      { role: 'auditor', count: 1, job: 'ตรวจงานที่ developer แก้มา', subject: 'ย้าย capture endpoint', elapsed: '1m 20s', startedAt: 0 },
    ])
  })

  test('agents of one role with different jobs keep a row each', async () => {
    const devs = [
      member({ verb: 'เขียนโค้ด', subject: 'refund', startedAt: 0 }),
      member({ verb: 'แก้ตามผลตรวจ (1 ข้อ)', subject: 'capture', startedAt: 0 }),
    ]
    expect(bandModel(plan, devs, 0)?.crew.map(r => r.job)).toEqual(['เขียนโค้ด', 'แก้ตามผลตรวจ (1 ข้อ)'])
  })

  test('groups parallel scouts on one job into one row timed from the first', async () => {
    const scouts = [
      member({ role: 'scout', verb: 'อ่าน ticket', subject: 'LMP-1234', startedAt: 0 }),
      member({ role: 'scout', verb: 'อ่าน ticket', subject: 'LMP-1235', startedAt: 5_000 }),
    ]
    const band = bandModel(parsePlan('# Mission: M\nStatus: planning\n'), scouts, 10_000)
    expect(band?.crew).toEqual([
      { role: 'scout', count: 2, job: 'อ่าน ticket', subject: 'LMP-1234, LMP-1235', elapsed: '10s', startedAt: 0 },
    ])
  })

  test('waits on approval when planned and nobody works, not while scouts still run', async () => {
    const planned = parsePlan(PLAN.replace('Status: in-progress', 'Status: planning'))
    expect(bandModel(planned, [], 0)?.alert?.kind).toBe('approval')
    expect(bandModel(planned, [member({ role: 'scout' })], 0)?.alert).toBe(null)
  })

  test('a blocked sub-task and a finished mission say so', async () => {
    expect(bandModel(parsePlan(PLAN.replace('| auditing |', '| blocked |')), [], 0)?.alert?.kind).toBe('blocked')
    expect(bandModel(parsePlan(PLAN.replace('Status: in-progress', 'Status: done')), [], 0)?.alert?.kind).toBe('done')
  })

  test('is hidden with no plan and no crew, and ignores finished agents', async () => {
    expect(bandModel(null, [], 0)).toBe(null)
    expect(bandModel(null, [member({ isRunning: false })], 0)).toBe(null)
    expect(bandModel(null, [member({})], 0)?.title).toBe(null)
  })
})

describe('Done when', () => {
  test('is read from the plan, and a template placeholder counts as none', async () => {
    expect(parsePlan(PLAN)?.doneWhen).toBe('every payment endpoint uses the new client')
    expect(parsePlan('# Mission: M\nDone when: <one sentence>\n')?.doneWhen).toBe(null)
  })
})

describe('tasksModel', () => {
  test('marks each sub-task and puts the working crew on the one in hand', async () => {
    const tasks = tasksModel(parsePlan(PLAN), [member({ role: 'auditor', verb: 'ตรวจงานที่ developer แก้มา' })], 5_000)
    expect([tasks?.done, tasks?.total]).toEqual([1, 4])
    expect(tasks?.rows.map(r => r.step)).toEqual(['done', 'current', 'todo', 'todo'])
    expect(tasks?.rows[1].stage).toBe('กำลังตรวจ')
    expect(tasks?.rows[1].crew.map(c => c.job)).toEqual(['ตรวจงานที่ developer แก้มา'])
    expect(tasks?.rows[2].crew).toEqual([])
  })
})

describe('parseReport', () => {
  test('reads an audit verdict and the short title of each FIX item', async () => {
    const report = [
      'VERDICT: FAIL',
      'AC:',
      '1. PASS. fine',
      'FIX:',
      '- Debug toast ships: register.tsx:65 calls $.ui.toast on every start.',
      '- `followUp` ignores the role and accepts any three-part summary, so the band shows a job nobody gave',
      'DETAILS: none',
    ].join('\n')
    expect(parseReport(report)).toEqual({
      result: 'FAIL',
      fixes: ['Debug toast ships', 'followUp ignores the role and accepts any three-part…'],
    })
  })

  test('nested bullets under a FIX item are its detail, not more fixes', async () => {
    const report = [
      'VERDICT: FAIL',
      'FIX:',
      '- Map misses sibling Latin letters (ð, ı, ħ): slugify.ts:2-10.',
      '  - `"Guðrún"` → `"gu-run"`',
      '  - `"Kırıkkale"` → `"k-r-kkale"`',
      '- Comment overclaims: slugify.ts:1 says all letters.',
      'DETAILS: none',
    ].join('\n')
    expect(parseReport(report).fixes).toEqual(['Map misses sibling Latin letters (ð, ı, ħ)', 'Comment overclaims'])
  })

  test('a passing audit and a developer status have no fixes', async () => {
    expect(parseReport('VERDICT: PASS\nFIX: none (PASS)\nDETAILS: none')).toEqual({ result: 'PASS', fixes: [] })
    expect(parseReport('STATUS: needs-input\nCHANGED: a.ts')).toEqual({ result: 'NEEDS-INPUT', fixes: [] })
  })
})

describe('planEvents', () => {
  test('logs the approval and the finished mission, nothing else', async () => {
    const planning = parsePlan(PLAN.replace('Status: in-progress', 'Status: planning'))
    const approved = parsePlan(PLAN.replace('Status: in-progress', 'Status: approved'))
    const done = parsePlan(PLAN.replace('Status: in-progress', 'Status: done'))
    expect(planEvents(planning, approved, 1).map(e => e.kind)).toEqual(['approved'])
    expect(planEvents(approved, done, 2).map(e => e.kind)).toEqual(['done'])
    expect(planEvents(approved, approved, 3)).toEqual([])
    expect(planEvents(null, approved, 4)).toEqual([])
  })
})

describe('logRows', () => {
  test('shows only this mission, with each audit outcome and its fixes', async () => {
    const entries: LogEntry[] = [
      { kind: 'approved', at: 0, mission: 'M', count: 2 },
      { kind: 'job', id: 'a#1', at: 0, mission: 'M', role: 'auditor', job: 'ตรวจงาน', subject: 'x', result: 'FAIL', fixes: ['Debug toast ships'] },
      { kind: 'job', id: 'b#1', at: 0, mission: 'Other', role: 'developer', job: 'เขียนโค้ด', subject: 'y' },
    ]
    const rows = logRows(entries, 'M')
    expect(rows.map(r => r.text)).toEqual(['อนุมัติแล้ว · 2 sub-task', 'ตรวจงาน · x'])
    expect(rows[1].outcome).toEqual({ text: '✗ ไม่ผ่าน', tone: 'error' })
    expect(rows[1].details).toEqual(['Debug toast ships'])
  })
})

describe('subTaskStats', () => {
  const at = (min: number) => min * 60_000
  const entries: LogEntry[] = [
    { kind: 'job', id: 'd#1', at: at(0), endedAt: at(1), mission: 'M', role: 'developer', job: 'เขียนโค้ด', subject: 'A' },
    { kind: 'job', id: 'a#1', at: at(1), endedAt: at(2), mission: 'M', role: 'auditor', job: 'ตรวจงาน', subject: 'A', result: 'FAIL' },
    { kind: 'job', id: 'a#2', at: at(3), endedAt: at(6), mission: 'M', role: 'auditor', job: 'ตรวจซ้ำ', subject: 'A', result: 'PASS' },
    { kind: 'job', id: 'x#1', at: at(9), mission: 'M', role: 'developer', job: 'เขียนโค้ด', subject: 'B' },
    { kind: 'job', id: 'o#1', at: at(0), mission: 'Other', role: 'auditor', job: 'ตรวจ', subject: 'A' },
  ]

  test('counts the audits on a sub-task and times it from first dispatch to last report', async () => {
    expect(subTaskStats(entries, 'M', 'A')).toEqual({ maker: 'developer', audits: 2, minutes: 6 })
  })

  test('a sub-task with no log yet has nothing to show', async () => {
    expect(subTaskStats(entries, 'M', 'C')).toEqual({ maker: null, audits: 0, minutes: null })
  })

  test('durations read in words', async () => {
    expect([duration(0), duration(6), duration(65)]).toEqual(['ไม่ถึง 1 นาที', '6 นาที', '1 ชม. 5 นาที'])
  })
})
