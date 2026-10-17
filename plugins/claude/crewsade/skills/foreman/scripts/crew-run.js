export const meta = {
  name: 'crewsade-run',
  description: 'Run one step of a crewsade mission: a batch of crew agents (scout, developer, auditor, worker), returning each one\'s report',
}

// Launched by the foreman skill: Workflow({ scriptPath, args }) with
//   args = { phase, agents: [{ role, job, subject, brief }] }
// phase  — the step's title in the progress tree
// agents — role is scout | developer | auditor | worker; job and subject make the label
//          `role · job · subject`; brief is the full brief text, sent as the agent's prompt

const ROLES = ['scout', 'developer', 'auditor', 'worker']
const WRITERS = ['developer', 'worker']

const { phase: title, agents: crew } = args ?? {}

if (!title || !Array.isArray(crew) || crew.length === 0) {
  throw new Error('args needs a phase title and a non-empty agents list')
}
for (const member of crew) {
  if (!ROLES.includes(member?.role)) throw new Error(`role must be one of ${ROLES.join(', ')}, got "${member?.role}"`)
  if (!member.job || !member.subject || typeof member.brief !== 'string' || !member.brief) {
    throw new Error(`every ${member.role} needs a job, a subject and a brief`)
  }
}
// Single writer: two agents that write files never run at the same time
if (crew.filter(member => WRITERS.includes(member.role)).length > 1) {
  throw new Error('only one agent that writes files may run at a time: launch one workflow per writer')
}

phase(title)

const replies = await parallel(
  crew.map(member => () =>
    agent(member.brief, {
      label: `${member.role} · ${member.job} · ${member.subject}`,
      phase: title,
      agentType: `crewsade:${member.role}`,
    }),
  ),
)

const results = crew.map((member, i) => ({
  role: member.role,
  job: member.job,
  subject: member.subject,
  reply: replies[i] ?? null,
}))

const silent = results.filter(result => result.reply == null)
if (silent.length) log(`${silent.length} agent(s) returned nothing: ${silent.map(r => `${r.role} · ${r.subject}`).join(', ')}`)

return results
