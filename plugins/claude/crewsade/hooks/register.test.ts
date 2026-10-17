import { expect, test } from 'claude-code/testing'

import { COMPACT_INSTRUCTIONS } from './logic'

const message = { role: 'user', text: 'hello', toolUses: [] } as const

// The restore flag lives in the hooks, so these go through the engine, not logic.ts
test('a compaction tells the summariser to keep the mission, besides what the person asked', async ($, on) => {
  let seen: string | undefined
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  await $.session.compact({ trigger: 'manual', messages: [message], instructions: 'keep the code' })
  expect(seen?.includes('keep the code')).toBe(true)
  expect(seen?.includes(COMPACT_INSTRUCTIONS)).toBe(true)
})

test("a subagent's own compaction is left alone", async ($, on) => {
  let seen: string | undefined = 'unset'
  on('session.compact', async (_$, e) => {
    seen = e.instructions
    return { messages: e.messages }
  })
  await $.session.compact({ trigger: 'auto', agentId: 'a1', messages: [message] })
  expect(seen).toBe(undefined)
})

test('a prompt in a session that was never compacted gets no memory', async ($, on) => {
  let context: readonly string[] | undefined = ['unset']
  on('prompt.submit', async (_$, e) => {
    context = e.context
    return { text: e.text }
  })
  await $.prompt.submit({ text: 'hello' })
  expect(context).toBe(undefined)
})
