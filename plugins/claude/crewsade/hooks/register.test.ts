import type { Engine } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { COMPACT_INSTRUCTIONS } from './logic'

const SLUG = '2026-10-18-payment-client'
const message = { role: 'user', text: 'hello', toolUses: [] } as const

// The foreman writes into its mission folder: that is how the session learns which one is its own.
// The test's `$` has no `state` noun, so the write goes through the engine, as in a session.
const writeInto = ($: Engine, path: string, agentId?: string) =>
  $.tool.call({ tool: 'Write', file_path: path, content: 'x', ...(agentId ? { agentId } : {}) })

// The restore flag and the session's mission live in the hooks, so these go through the engine
test('a compaction tells the summariser to keep the mission, besides what the person asked', async ($, on) => {
  let seen: string | undefined
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  await $.session.compact({ trigger: 'manual', messages: [message], instructions: 'keep the code' })
  expect(seen?.includes('keep the code')).toBe(true)
  expect(seen?.includes(COMPACT_INSTRUCTIONS)).toBe(true)
  // no mission folder yet, so none is named
  expect(seen?.includes('.crewsade/missions/')).toBe(false)
})

test("a compaction names this session's mission folder", async ($, on) => {
  let seen: string | undefined
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }))
  await writeInto($, `.crewsade/missions/${SLUG}/plan.md`)
  await $.session.compact({ trigger: 'auto', messages: [message] })
  expect(seen?.includes(`.crewsade/missions/${SLUG}/`)).toBe(true)
})

test("a subagent's own compaction is left alone", async ($, on) => {
  let seen: string | undefined = 'unset'
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }))
  await writeInto($, `.crewsade/missions/${SLUG}/plan.md`)
  await $.session.compact({ trigger: 'auto', agentId: 'a1', messages: [message] })
  expect(seen).toBe(undefined)
})

test('a prompt in a session that was never compacted gets no memory', async ($, on) => {
  let context: readonly string[] | undefined = ['unset']
  on('prompt.submit', async (_$, e) => {
    context = e.context
    return { text: e.text }
  })
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }))
  await writeInto($, `.crewsade/missions/${SLUG}/plan.md`)
  await $.prompt.submit({ text: 'hello' })
  expect(context).toBe(undefined)
})

test('the first prompt after a compaction carries the mission folder, once', async ($, on) => {
  const seen: (readonly string[] | undefined)[] = []
  on('session.compact', async (_$, e) => ({ messages: e.messages }))
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }))
  on('prompt.submit', async (_$, e) => {
    seen.push(e.context)
    return { text: e.text }
  })
  await writeInto($, `.crewsade/missions/${SLUG}/plan.md`)
  await $.session.compact({ trigger: 'manual', messages: [message] })
  await $.prompt.submit({ text: 'first' })
  await $.prompt.submit({ text: 'second' })
  expect(seen[0]?.some(block => block.includes(`.crewsade/missions/${SLUG}/`))).toBe(true)
  expect(seen[1]).toBe(undefined)
})

test("a crew agent's write into a mission folder does not choose the session's mission", async ($, on) => {
  let seen: string | undefined
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }))
  await writeInto($, `.crewsade/missions/${SLUG}/reports/1-developer-1.md`, 'agent-1')
  await $.session.compact({ trigger: 'auto', messages: [message] })
  expect(seen?.includes('.crewsade/missions/')).toBe(false)
})

test('a write outside any mission folder changes nothing', async ($, on) => {
  let seen: string | undefined
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }))
  await writeInto($, 'src/app.ts')
  await $.session.compact({ trigger: 'auto', messages: [message] })
  expect(seen?.includes('.crewsade/missions/')).toBe(false)
})
