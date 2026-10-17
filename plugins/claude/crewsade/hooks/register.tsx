import type { Engine, Register } from 'claude-code'

import { COMPACT_INSTRUCTIONS, memoryContext } from './logic'

const PLAN = '.crewsade/plan.md'
const STANDING = '.crewsade/standing.md'

// Put the crewsade memory back into context on the next prompt, but only after this
// conversation was compacted: a session that was never compacted lost nothing, and a new
// session in the same project must not be handed another session's mission.
let isRestoreDue = false

async function readIfThere($: Engine, path: string): Promise<string | null> {
  try {
    return (await $.fs.exists(path)) ? await $.fs.read(path) : null
  } catch {
    return null
  }
}

export const register: Register = on => {
  // A compaction loses what lived only in the conversation: tell the summariser what to
  // keep, and put the files back on the next prompt
  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    isRestoreDue = true
    const instructions = [e.instructions, COMPACT_INSTRUCTIONS].filter(Boolean).join('\n')
    return next({ ...e, instructions })
  })

  on('prompt.submit', async ($, e, next) => {
    if (!isRestoreDue) return next(e)
    isRestoreDue = false
    const memory = memoryContext(await readIfThere($, STANDING), await readIfThere($, PLAN))
    if (!memory) return next(e)
    return next({ ...e, context: [...(e.context ?? []), memory] })
  })
}
