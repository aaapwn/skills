// Pure logic for crewsade's memory across a compaction: reading plan.md, and composing what
// goes back into the model's context. No `$` here, so tests can call it.

export type Plan = {
  title: string
  status: string
  doneWhen: string | null
}

// Reads the shape references/plan-template.md defines: `# Mission:`, `Status:` and `Done when:`
export function parsePlan(text: string): Plan | null {
  const title = text.match(/^#\s*Mission:\s*(.+)$/m)?.[1]?.trim()
  if (!title) return null

  const status = text.match(/^Status:\s*([\w-]+)/m)?.[1]?.trim() ?? 'planning'
  const doneWhen = text.match(/^Done when:\s*(.+)$/m)?.[1]?.trim() ?? null

  return { title, status: status.toLowerCase(), doneWhen: doneWhen && !doneWhen.startsWith('<') ? doneWhen : null }
}

// ---- Which mission is this session's ----

// Every mission lives in its own folder, so sessions in one project never share a plan
export const MISSIONS = '.crewsade/missions'

export const missionDir = (slug: string) => `${MISSIONS}/${slug}`

// The slug of the mission folder a path sits in (absolute or relative), or null
export function missionOf(path: string): string | null {
  return path.match(/(?:^|\/)\.crewsade\/missions\/([^/]+)\//)?.[1] ?? null
}

// ---- Memory after a compaction ----

// The body of a `## <heading>` section, up to the next `## `, or null when it is absent
// or still holds only the template's placeholders.
export function sectionOf(text: string, heading: string): string | null {
  const parts = text.split(new RegExp(`^##\\s+${heading}\\s*$`, 'm'))
  if (parts.length < 2) return null
  const body = parts[1].split(/^##\s/m)[0].trim()
  const real = body
    .split('\n')
    .filter(line => line.trim() && !/<[^>]+>/.test(line))
    .join('\n')
  return real || null
}

// What goes back into the model's context after the conversation is summarised: the
// user's standing instructions, which mission folder is this session's, and where that
// mission stands. Null when there is none of it.
export function memoryContext(standing: string | null, planText: string | null, slug: string | null): string | null {
  const rules = standing
    ?.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .join('\n')
  const plan = planText ? parsePlan(planText) : null
  const isActive = plan !== null && plan.status !== 'done' && plan.status !== 'aborted'
  if (!rules && !slug) return null

  const out = ['crewsade memory, put back after the conversation was summarised. Treat it as current.']
  if (rules) out.push('', 'Standing instructions from the user (.crewsade/standing.md) — follow them:', rules)
  if (slug) {
    const dir = missionDir(slug)
    out.push(
      '',
      `This session's mission folder is ${dir}/ — its plan.md, context/ and reports/ are this session's mission.`,
      `Every other folder under ${MISSIONS}/ belongs to another session: never read or write them.`,
    )
    if (isActive && plan && planText) {
      out.push('', `Mission: ${plan.title} (${plan.status})`)
      if (plan.doneWhen) out.push(`Done when: ${plan.doneWhen}`)
      const now = sectionOf(planText, 'Now')
      if (now) out.push('', 'Now:', now)
      const notes = sectionOf(planText, 'Notes')
      if (notes) out.push('', 'Notes:', notes)
      out.push('', `Sub-tasks, AC and the decision log are in ${dir}/plan.md — read it before the next step.`)
    }
  }
  return out.join('\n')
}

// What the summariser is told to keep, so the summary itself carries the mission too
export const COMPACT_INSTRUCTIONS =
  'Keep the crewsade mission state: the goal, the sub-task in hand and what comes next, ' +
  'every standing instruction the user gave (also in .crewsade/standing.md), and open questions.'

// The same, naming this session's mission folder when it is known, so the summary keeps
// the exact path and says the other folders are other sessions'
export function compactInstructions(slug: string | null): string {
  if (!slug) return COMPACT_INSTRUCTIONS
  return (
    `${COMPACT_INSTRUCTIONS} This session's mission folder is ${missionDir(slug)}/: write that exact ` +
    `path in the summary, and say that every other folder under ${MISSIONS}/ belongs to another session.`
  )
}
