// Pure logic for the crewsade band: parsing plan.md, reading the job the foreman gave each
// agent, and composing what the band shows. No `$` here, so tests can call it.
//
// The band shows only what it is told: the job from the Agent call's description or a
// SendMessage summary. It never guesses what an agent is doing from its tool calls.

export type Role = 'scout' | 'developer' | 'auditor' | 'worker'

export type SubTask = { id: string; title: string; status: string; failed: number }

export type Plan = {
  title: string
  status: string
  doneWhen: string | null
  subTasks: SubTask[]
}

export type Crew = {
  role: Role
  // The address SendMessage reaches it by, when the Agent call named it
  name?: string
  // The job the foreman gave it: the Agent call's description, or the latest
  // SendMessage summary that follows the same `role · verb · subject` shape
  verb: string
  subject: string
  startedAt: number
  isRunning: boolean
}

export const ICON: Record<Role, string> = {
  scout: '🔍',
  developer: '🛠',
  auditor: '🧪',
  worker: '📝',
}

const DEFAULT_VERB: Record<Role, string> = {
  scout: 'สำรวจ',
  developer: 'เขียนโค้ด',
  auditor: 'ตรวจงาน',
  worker: 'ทำงาน',
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim())

// Reads the shape references/plan-template.md defines: `# Mission:`, `Status:`, and the
// sub-task table under `## Sub-tasks` with columns # | Sub-task | Agent | Status | Failed rounds.
export function parsePlan(text: string): Plan | null {
  const title = text.match(/^#\s*Mission:\s*(.+)$/m)?.[1]?.trim()
  if (!title) return null

  const status = text.match(/^Status:\s*([\w-]+)/m)?.[1]?.trim() ?? 'planning'
  const doneWhen = text.match(/^Done when:\s*(.+)$/m)?.[1]?.trim() ?? null

  const subTasks: SubTask[] = []
  const section = text.split(/^##\s+Sub-tasks\s*$/m)[1]
  if (section) {
    const lines = section.split('\n')
    let header: string[] | null = null
    for (const line of lines) {
      if (/^##\s/.test(line)) break
      if (!line.trim().startsWith('|')) {
        if (header) break
        continue
      }
      const row = cells(line)
      if (!header) {
        header = row.map(h => h.toLowerCase())
        continue
      }
      if (row.every(c => /^:?-+:?$/.test(c))) continue

      const col = (name: string) => row[header!.findIndex(h => h.startsWith(name))] ?? ''
      const title = col('sub-task')
      if (!title || title.startsWith('<')) continue
      subTasks.push({
        id: col('#'),
        title,
        status: col('status').toLowerCase(),
        failed: Number.parseInt(col('failed'), 10) || 0,
      })
    }
  }

  return { title, status: status.toLowerCase(), doneWhen: doneWhen && !doneWhen.startsWith('<') ? doneWhen : null, subTasks }
}

export function roleOf(subagentType: string): Role | null {
  const m = subagentType.match(/^crewsade:(scout|developer|auditor|worker)$/)
  return (m?.[1] as Role) ?? null
}

// The foreman writes descriptions as `role · verb · subject`. Anything else still shows:
// the role's default verb, with the whole description as the subject.
export function parseDescription(role: Role, description: string): { verb: string; subject: string } {
  const parts = description.split('·').map(p => p.trim()).filter(Boolean)
  if (parts.length >= 3) return { verb: parts[1], subject: parts.slice(2).join(' · ') }
  if (parts.length === 2) return { verb: parts[0] === role ? DEFAULT_VERB[role] : parts[0], subject: parts[1] }
  return { verb: DEFAULT_VERB[role], subject: description.trim() }
}

// A SendMessage summary in the `role · verb · subject` shape gives the agent a new job
// (a developer sent back to fix audit findings); any other summary leaves the job as it was.
export function followUp(member: Crew, summary: string | undefined): Pick<Crew, 'verb' | 'subject'> {
  const parts = (summary ?? '').split('·').map(p => p.trim()).filter(Boolean)
  // Only a summary that names this agent's own role is a job for it
  if (parts.length < 3 || parts[0] !== member.role) {
    return { verb: member.verb, subject: member.subject }
  }
  return { verb: parts[1], subject: parts.slice(2).join(' · ') }
}

export function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export type Step = 'done' | 'current' | 'blocked' | 'todo'

export type CrewRow = { role: Role; count: number; job: string; subject: string; elapsed: string; startedAt: number }

export type Alert = { kind: 'approval' | 'blocked' | 'failed' | 'done'; text: string }

// The sub-task the mission is on now, or the next one to start, in words
export type Current = { title: string; isNext: boolean; stage: string; failed: number }

export type Band = {
  title: string | null
  steps: Step[]
  done: number
  total: number
  current: Current | null
  crew: CrewRow[]
  alert: Alert | null
}

const STAGE: Record<string, string> = {
  'in-progress': 'กำลังทำ',
  auditing: 'กำลังตรวจ',
  blocked: 'ติดอยู่',
}

function crewRows(running: Crew[], now: number): CrewRow[] {
  // Parallel scouts on one job read as one row; agents doing different jobs keep their own
  const isOneJob = running.every(c => c.role === running[0]?.role && c.verb === running[0]?.verb)
  if (running.length > 1 && isOneJob) {
    const first = running.reduce((a, b) => (a.startedAt <= b.startedAt ? a : b))
    return [
      {
        role: first.role,
        count: running.length,
        job: first.verb,
        subject: running.map(c => c.subject).join(', '),
        elapsed: elapsed(now - first.startedAt),
        startedAt: first.startedAt,
      },
    ]
  }
  return running.map(c => ({
    role: c.role,
    count: 1,
    job: c.verb,
    subject: c.subject,
    elapsed: elapsed(now - c.startedAt),
    startedAt: c.startedAt,
  }))
}

// What the band shows, or null to show nothing.
export function bandModel(plan: Plan | null, crew: Crew[], now: number): Band | null {
  const running = crew.filter(c => c.isRunning)
  const rows = crewRows(running, now)

  if (!plan || plan.status === 'aborted') {
    if (!rows.length) return null
    return { title: null, steps: [], done: 0, total: 0, current: null, crew: rows, alert: null }
  }

  const steps: Step[] = plan.subTasks.map(t =>
    t.status === 'done' ? 'done' : t.status === 'blocked' ? 'blocked' : t.status === 'todo' ? 'todo' : 'current',
  )
  const total = steps.length
  const done = steps.filter(s => s === 'done').length
  const active = plan.subTasks.find(t => t.status !== 'done' && t.status !== 'todo')
  const upcoming = plan.subTasks.find(t => t.status === 'todo')
  let current: Current | null = null
  if (active) current = { title: active.title, isNext: false, stage: STAGE[active.status] ?? active.status, failed: active.failed }
  else if (upcoming && plan.status !== 'planning') current = { title: upcoming.title, isNext: true, stage: '', failed: 0 }

  let alert: Alert | null = null
  if (plan.status === 'done') alert = { kind: 'done', text: 'mission เสร็จแล้ว' }
  else if (steps.includes('blocked')) alert = { kind: 'blocked', text: 'ติดอยู่ — รอคุณตัดสิน' }
  else if (plan.status === 'planning' && total > 0 && !rows.length)
    alert = { kind: 'approval', text: `รอคุณอนุมัติแผน — ${total} sub-task` }

  return { title: plan.title, steps, done, total, current, crew: rows, alert }
}

// ---- Tasks pane ----

export type TaskRow = {
  id: string
  title: string
  step: Step
  // The stage in words for the sub-task in hand ('' for done and todo)
  stage: string
  failed: number
  // Agents working now, shown on the sub-task in hand
  crew: CrewRow[]
}

export type Tasks = { title: string; doneWhen: string | null; done: number; total: number; rows: TaskRow[] }

export function tasksModel(plan: Plan | null, crew: Crew[], now: number): Tasks | null {
  if (!plan) return null
  const rows = crewRows(crew.filter(c => c.isRunning), now)
  const active = plan.subTasks.find(t => t.status !== 'done' && t.status !== 'todo')
  return {
    title: plan.title,
    doneWhen: plan.doneWhen,
    done: plan.subTasks.filter(t => t.status === 'done').length,
    total: plan.subTasks.length,
    rows: plan.subTasks.map(t => ({
      id: t.id,
      title: t.title,
      step: t.status === 'done' ? 'done' : t.status === 'blocked' ? 'blocked' : t.status === 'todo' ? 'todo' : 'current',
      stage: t === active ? (STAGE[t.status] ?? t.status) : '',
      failed: t.failed,
      crew: t === active ? rows : [],
    })),
  }
}

// ---- Log ----
//
// Every line comes from something the crew or the foreman stated: a dispatch description,
// a SendMessage summary, the VERDICT / STATUS line of a report, or plan.md's Status.

export type LogEntry =
  | {
      kind: 'job'
      id: string // agent id and run, so a finish lands on the run it ends
      at: number
      mission: string
      role: Role
      job: string
      subject: string
      result?: string // VERDICT for an auditor, STATUS for the rest
      fixes?: string[]
      endedAt?: number
    }
  | { kind: 'approved' | 'done'; at: number; mission: string; count: number }

// The verdict or status line of a crew report, and the short titles of an audit's FIX items.
// A FIX item is `- <title>: <detail>`; one with no short title shows its first words.
export function parseReport(answer: string): { result: string | null; fixes: string[] } {
  const result = answer.match(/^\s*(?:VERDICT|STATUS):\s*([A-Za-z-]+)/m)?.[1]?.toUpperCase() ?? null
  const fixes: string[] = []
  const add = (raw: string) => {
    const item = raw.replace(/`/g, '').trim()
    if (!item || /^none\b/i.test(item)) return
    const colon = item.indexOf(': ')
    if (colon > 0 && colon <= 60) fixes.push(item.slice(0, colon))
    else {
      const words = item.split(/\s+/)
      fixes.push(words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : item)
    }
  }
  const section = answer.split(/^\s*FIX:/m)[1]
  if (section) {
    const [first, ...rest] = section.split('\n')
    add(first ?? '')
    // Items at the first item's indent are fixes; deeper ones are that fix's detail
    let indent: number | null = null
    for (const line of rest) {
      // The next section of the report ends the list
      if (/^\s*[A-Z][A-Z -]+:/.test(line)) break
      const m = line.match(/^(\s*)(?:[-*]|\d+[.)])\s+(.+)$/)
      if (!m) continue
      indent ??= m[1].length
      if (m[1].length <= indent) add(m[2])
    }
  }
  return { result, fixes }
}

// What a change in plan.md adds to the log: the plan approved, the mission done.
export function planEvents(prev: Plan | null, next: Plan | null, at: number): LogEntry[] {
  if (!prev || !next || prev.title !== next.title) return []
  const count = next.subTasks.length
  const out: LogEntry[] = []
  if (prev.status === 'planning' && next.status !== 'planning' && next.status !== 'aborted')
    out.push({ kind: 'approved', at, mission: next.title, count })
  if (prev.status !== 'done' && next.status === 'done') out.push({ kind: 'done', at, mission: next.title, count })
  return out
}

export type LogRow = {
  time: string
  icon: string
  who: string
  role: Role | null
  text: string
  outcome: { text: string; tone: 'success' | 'error' | 'warning' | 'subtle' } | null
  details: string[]
}

const OUTCOME: Record<string, LogRow['outcome']> = {
  PASS: { text: '✓ ผ่าน', tone: 'success' },
  FAIL: { text: '✗ ไม่ผ่าน', tone: 'error' },
  'NEEDS-HUMAN': { text: '? รอคุณตรวจ', tone: 'warning' },
  SOUND: { text: '✓ แผนโอเค', tone: 'success' },
  REVISE: { text: '✗ ให้แก้แผน', tone: 'error' },
  DONE: { text: 'เสร็จ', tone: 'subtle' },
  PARTIAL: { text: 'ทำได้บางส่วน', tone: 'warning' },
  'NEEDS-INPUT': { text: 'มีคำถาม', tone: 'warning' },
}

export const clock = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function logRows(entries: LogEntry[], mission: string): LogRow[] {
  return entries
    .filter(e => e.mission === mission)
    .map(e => {
      if (e.kind === 'approved')
        return { time: clock(e.at), icon: '📋', who: 'แผน', role: null, text: `อนุมัติแล้ว · ${e.count} sub-task`, outcome: null, details: [] }
      if (e.kind === 'done')
        return { time: clock(e.at), icon: '🏁', who: 'mission', role: null, text: 'เสร็จแล้ว', outcome: null, details: [] }
      return {
        time: clock(e.at),
        icon: ICON[e.role],
        who: e.role,
        role: e.role,
        text: `${e.job} · ${e.subject}`,
        outcome: e.result ? (OUTCOME[e.result] ?? { text: e.result, tone: 'subtle' }) : null,
        details: e.fixes ?? [],
      }
    })
}

// ---- Per sub-task history, from the log ----

export type SubTaskStats = { maker: Role | null; audits: number; minutes: number | null }

// Who built a sub-task, how many audits it took, and how long from first dispatch to last
// report. Jobs are matched to the sub-task by the subject the foreman wrote: its title.
export function subTaskStats(entries: LogEntry[], mission: string, title: string): SubTaskStats {
  const jobs = entries.filter(
    (e): e is Extract<LogEntry, { kind: 'job' }> => e.kind === 'job' && e.mission === mission && e.subject === title,
  )
  if (!jobs.length) return { maker: null, audits: 0, minutes: null }
  const maker = jobs.find(j => j.role === 'developer' || j.role === 'worker')?.role ?? null
  const audits = jobs.filter(j => j.role === 'auditor').length
  const start = Math.min(...jobs.map(j => j.at))
  const end = Math.max(...jobs.map(j => j.endedAt ?? j.at))
  return { maker, audits, minutes: Math.round((end - start) / 60_000) }
}

export function duration(minutes: number): string {
  if (minutes < 1) return 'ไม่ถึง 1 นาที'
  if (minutes < 60) return `${minutes} นาที`
  return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`
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
// user's standing instructions, and where the mission stands. Null when there is none.
export function memoryContext(standing: string | null, planText: string | null): string | null {
  const rules = standing
    ?.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .join('\n')
  const plan = planText ? parsePlan(planText) : null
  const isActive = plan !== null && plan.status !== 'done' && plan.status !== 'aborted'
  if (!rules && !isActive) return null

  const out = ['crewsade memory, put back after the conversation was summarised. Treat it as current.']
  if (rules) out.push('', 'Standing instructions from the user (.crewsade/standing.md) — follow them:', rules)
  if (isActive && plan && planText) {
    out.push('', `Mission: ${plan.title} (${plan.status})`)
    if (plan.doneWhen) out.push(`Done when: ${plan.doneWhen}`)
    const now = sectionOf(planText, 'Now')
    if (now) out.push('', 'Now:', now)
    const notes = sectionOf(planText, 'Notes')
    if (notes) out.push('', 'Notes:', notes)
    out.push('', 'Sub-tasks, AC and the decision log are in .crewsade/plan.md — read it before the next step.')
  }
  return out.join('\n')
}

// What the summariser is told to keep, so the summary itself carries the mission too
export const COMPACT_INSTRUCTIONS =
  'Keep the crewsade mission state: the goal, the sub-task in hand and what comes next, ' +
  'every standing instruction the user gave (also in .crewsade/standing.md), and open questions.'
