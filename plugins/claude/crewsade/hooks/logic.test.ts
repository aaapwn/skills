import { describe, expect, test } from 'claude-code/testing'

import { COMPACT_INSTRUCTIONS, compactInstructions, memoryContext, missionDir, missionOf, parsePlan, sectionOf } from './logic'

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

describe('parsePlan', () => {
  test('reads the title, status and Done when', async () => {
    const plan = parsePlan(PLAN)
    expect(plan?.title).toBe('Payment client migration')
    expect(plan?.status).toBe('in-progress')
    expect(plan?.doneWhen).toBe('every payment endpoint uses the new client')
  })

  test('a template placeholder counts as no Done when', async () => {
    expect(parsePlan('# Mission: M\nDone when: <one sentence>\n')?.doneWhen).toBe(null)
  })

  test('a plan without a Status line is still planning', async () => {
    expect(parsePlan('# Mission: M\n')?.status).toBe('planning')
  })

  test('is null without a mission line', async () => {
    expect(parsePlan('just notes')).toBe(null)
  })
})

describe('memory after a compaction', () => {
  const plan = PLAN.replace('## Sub-tasks', `## Now
Doing: auditor checks sub-task 2
Next: commit, then sub-task 3

## Notes
- the old client is still imported by the cron job; remove it last

## Sub-tasks`)

  test('reads a section, and ignores one that holds only template placeholders', async () => {
    expect(sectionOf(plan, 'Now')).toBe('Doing: auditor checks sub-task 2\nNext: commit, then sub-task 3')
    expect(sectionOf('## Now\nDoing: <the step in hand>\nNext: <what next>\n', 'Now')).toBe(null)
    expect(sectionOf(plan, 'Missing')).toBe(null)
  })

  const SLUG = '2026-10-18-payment-client'

  test('puts back the standing instructions, the mission folder and where the mission stands', async () => {
    const memory = memoryContext('# Standing\n- tell me with `say` when done\n- never push without asking\n', plan, SLUG)!
    expect(memory.includes('- tell me with `say` when done')).toBe(true)
    expect(memory.includes('- never push without asking')).toBe(true)
    expect(memory.includes(`This session's mission folder is ${missionDir(SLUG)}/`)).toBe(true)
    expect(memory.includes('belongs to another session')).toBe(true)
    expect(memory.includes('Mission: Payment client migration (in-progress)')).toBe(true)
    expect(memory.includes('Next: commit, then sub-task 3')).toBe(true)
    expect(memory.includes('remove it last')).toBe(true)
    expect(memory.includes(`in ${missionDir(SLUG)}/plan.md`)).toBe(true)
  })

  test('a finished mission still names its folder, but not its state', async () => {
    const memory = memoryContext(null, PLAN.replace('Status: in-progress', 'Status: done'), SLUG)!
    expect(memory.includes(missionDir(SLUG))).toBe(true)
    expect(memory.includes('Mission:')).toBe(false)
  })

  test('standing instructions come back even when the session has no mission', async () => {
    const memory = memoryContext('- reply in Thai\n', null, null)!
    expect(memory.includes('- reply in Thai')).toBe(true)
    expect(memory.includes('mission folder')).toBe(false)
  })

  test('another session\'s plan is never read in: no folder means no mission block', async () => {
    const memory = memoryContext('- reply in Thai\n', plan, null)!
    expect(memory.includes('Mission:')).toBe(false)
  })

  test('nothing to put back is null', async () => {
    expect(memoryContext(null, null, null)).toBe(null)
    expect(memoryContext('\n# Standing\n', plan, null)).toBe(null)
  })
})

describe('which mission is this session\'s', () => {
  test('reads the slug from a path inside a mission folder, absolute or relative', async () => {
    expect(missionOf('.crewsade/missions/2026-10-18-a/plan.md')).toBe('2026-10-18-a')
    expect(missionOf('/work/proj/.crewsade/missions/2026-10-18-a/context/baseline.md')).toBe('2026-10-18-a')
  })

  test('paths outside a mission folder are nobody\'s', async () => {
    expect(missionOf('.crewsade/standing.md')).toBe(null)
    expect(missionOf('src/.crewsade/missions')).toBe(null)
    expect(missionOf('/work/proj/src/app.ts')).toBe(null)
  })

  test('the compaction instructions name the folder when it is known', async () => {
    expect(compactInstructions(null)).toBe(COMPACT_INSTRUCTIONS)
    expect(compactInstructions('2026-10-18-a').includes('.crewsade/missions/2026-10-18-a/')).toBe(true)
    expect(compactInstructions('2026-10-18-a').startsWith(COMPACT_INSTRUCTIONS)).toBe(true)
  })
})
