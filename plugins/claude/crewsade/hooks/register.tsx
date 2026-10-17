import type { Engine, Register } from 'claude-code'

import { compactInstructions, memoryContext, missionDir, missionOf } from './logic'

const STANDING = '.crewsade/standing.md'

// Which mission folder is this session's: held by the host for the session, so another
// session in the same project, or a reload of this module, cannot change it
const mission = { plugin: 'crewsade', key: 'mission' } as const

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

async function currentMission($: Engine): Promise<string | null> {
  const { value } = await $.state.get(mission)
  return value ?? null
}

export const register: Register = on => {
  // The foreman's own writes into a mission folder say which one is this session's. A
  // crew agent writes there too, so only the main conversation counts.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    const path = typeof e.file_path === 'string' ? e.file_path : ''
    if (!e.agentId && (e.tool === 'Write' || e.tool === 'Edit') && path) {
      const slug = missionOf(path)
      if (slug && slug !== (await currentMission($))) await $.state.set(mission, slug)
    }
    return result
  })

  // A compaction loses what lived only in the conversation: tell the summariser what to
  // keep, with this session's mission folder by name, and put the files back on the next prompt
  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    isRestoreDue = true
    const instructions = [e.instructions, compactInstructions(await currentMission($))].filter(Boolean).join('\n')
    return next({ ...e, instructions })
  })

  on('prompt.submit', async ($, e, next) => {
    if (!isRestoreDue) return next(e)
    isRestoreDue = false
    const slug = await currentMission($)
    const plan = slug ? await readIfThere($, `${missionDir(slug)}/plan.md`) : null
    const memory = memoryContext(await readIfThere($, STANDING), plan, slug)
    if (!memory) return next(e)
    return next({ ...e, context: [...(e.context ?? []), memory] })
  })
}
