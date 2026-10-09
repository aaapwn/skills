import type { Color, Engine, Register } from 'claude-code'

import {
  ICON,
  bandModel,
  followUp,
  logRows,
  parseDescription,
  parsePlan,
  parseReport,
  planEvents,
  roleOf,
  subTaskStats,
  tasksModel,
  type Crew,
  type LogEntry,
  type Plan,
  type Role,
  type Step,
} from './logic'
import { logCard } from './logcard'
import { tasksSvg } from './taskscard'

const PLAN = '.crewsade/plan.md'
const LOG = '.crewsade/log.jsonl'
const COMMAND = 'crewsade-band'
const TASKS_PANE = 'crewsade-tasks'
const LOG_PANE = 'crewsade-log'

// Module state: reset when the mod reloads, rebuilt from plan.md and later events
let plan: Plan | null = null
// Crew agents this session has seen, by agent id
const crew = new Map<string, Crew>()

const hasRunning = () => [...crew.values()].some(c => c.isRunning)

// The mission log, kept in .crewsade/log.jsonl so it outlives a reload or a restart
let log: LogEntry[] = []
// Each agent's runs, and the log entry its current run writes its result into
const runs = new Map<string, number>()
const openRun = new Map<string, string>()

// Hidden by the person, until they show it again or start the foreman again
let isHidden = false

// Spinner frame, advanced only while an agent works
let frame = 0
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

// Theme keys, so the colours follow light and dark themes
const ROLE_COLOR: Record<Role, Color> = {
  scout: 'suggestion',
  developer: 'claude',
  auditor: 'warning',
  worker: 'merged',
}
const BAR = 16
const STAGE_COLOR: Record<string, Color> = { กำลังทำ: 'claude', กำลังตรวจ: 'warning', ติดอยู่: 'error' }

const STEP_MARK: Record<Step, { glyph: string; color: Color }> = {
  done: { glyph: '✓', color: 'success' },
  current: { glyph: '▶', color: 'warning' },
  blocked: { glyph: '⛔', color: 'error' },
  todo: { glyph: '○', color: 'inactive' },
}

const ALERT = {
  approval: { glyph: '⏸', color: 'warning' },
  blocked: { glyph: '⛔', color: 'error' },
  failed: { glyph: '✗', color: 'error' },
  done: { glyph: '✓', color: 'success' },
} as const

// A label on a coloured ground, for a stage or an outcome
function chip(Text: (props: Record<string, unknown>) => unknown, label: string, color: Color) {
  return (
    <Text backgroundColor={color} color="inverseText" bold>
      {` ${label} `}
    </Text>
  )
}

// Re-reads plan.md; logs an approval or a finished mission, redraws when the plan changed
async function refresh($: Engine) {
  let next: Plan | null = null
  try {
    if (await $.fs.exists(PLAN)) next = parsePlan(await $.fs.read(PLAN))
  } catch {
    next = null
  }
  if (JSON.stringify(next) !== JSON.stringify(plan)) {
    const events = planEvents(plan, next, await $.clock.now())
    plan = next
    if (events.length) {
      log.push(...events)
      await saveLog($)
    }
    $.ui.invalidate('ui.render')
  }
}

async function loadLog($: Engine) {
  try {
    if (!(await $.fs.exists(LOG))) return
    const text = await $.fs.read(LOG)
    log = text
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as LogEntry)
  } catch {
    log = []
  }
}

async function saveLog($: Engine) {
  try {
    await $.fs.write(LOG, log.map(entry => JSON.stringify(entry)).join('\n') + '\n')
  } catch {
    // The band keeps working from memory; the log is only lost on a reload
  }
}

// A crew agent starts a job: from its dispatch, or from a SendMessage that gives it a new one
async function startJob($: Engine, agentId: string, member: Crew) {
  if (!plan) return
  const run = (runs.get(agentId) ?? 0) + 1
  runs.set(agentId, run)
  const id = `${agentId}#${run}`
  openRun.set(agentId, id)
  log.push({
    kind: 'job',
    id,
    at: await $.clock.now(),
    mission: plan.title,
    role: member.role,
    job: member.verb,
    subject: member.subject,
  })
  await saveLog($)
}

// The agent's report ends its run: its verdict or status, and an audit's FIX titles
async function finishJob($: Engine, agentId: string, answer: string) {
  const id = openRun.get(agentId)
  const entry = log.find(one => one.kind === 'job' && one.id === id)
  if (!entry || entry.kind !== 'job') return
  const { result, fixes } = parseReport(answer)
  if (result) entry.result = result
  entry.fixes = fixes
  entry.endedAt = await $.clock.now()
  await saveLog($)
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Show or hide the crewsade status band',
      argumentHint: 'show | hide | tasks | log',
      immediate: true,
    })
    await loadLog($)
    await refresh($)
    // The plan changes on disk as the foreman works, and the elapsed time ticks
    $.clock.every(2000, () => refresh($))
    // The spinner and the elapsed time move while the crew works
    $.clock.every(250, () => {
      if (!hasRunning()) return
      frame = (frame + 1) % SPIN.length
      $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'tasks' || arg === 'task') {
      await $.ui.open({ id: TASKS_PANE, title: 'Tasks' })
      return { text: 'crewsade tasks opened' }
    }
    if (arg === 'log' || arg === 'logs') {
      await $.ui.open({ id: LOG_PANE, title: 'Log' })
      return { text: 'crewsade log opened' }
    }
    isHidden = arg === 'hide' ? true : arg === 'show' ? false : !isHidden
    $.ui.invalidate('ui.render')
    return { text: isHidden ? `crewsade band hidden — /${COMMAND} show to bring it back` : 'crewsade band shown' }
  })

  // Using crewsade again brings the band back, whatever was hidden before
  on('skill.prompt', async ($, e, next) => {
    if (e.skill === 'crewsade:foreman' && isHidden) {
      isHidden = false
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    const role = roleOf(e.subagentType)
    if (role && result.agentId) {
      const { verb, subject } = parseDescription(role, e.description)
      const member: Crew = {
        role,
        name: e.name,
        verb,
        subject,
        startedAt: await $.clock.now(),
        isRunning: true,
      }
      crew.set(result.agentId, member)
      await startJob($, result.agentId, member)
      $.ui.invalidate('ui.render')
    }
    return result
  })

  on('tool.call', async ($, e, next) => {
    const member = e.agentId ? crew.get(e.agentId) : undefined
    if (member) {
      // A finished agent that a SendMessage woke is working again
      if (!member.isRunning) {
        member.isRunning = true
        member.startedAt = await $.clock.now()
        $.ui.invalidate('ui.render')
      }
      return next(e)
    }

    // The foreman sends an agent back to work: its summary, if shaped like a
    // description, is the agent's new job
    if (!e.agentId && e.tool === 'SendMessage' && typeof e.to === 'string') {
      const to = e.to
      const found = [...crew.entries()].find(([id, c]) => id === to || c.name === to)
      if (found) {
        const [agentId, target] = found
        const job = followUp(target, typeof e.summary === 'string' ? e.summary : undefined)
        const isNewJob = job.verb !== target.verb || job.subject !== target.subject
        Object.assign(target, job)
        // A new job is a new line in the log; a plain follow-up continues the last one
        if (isNewJob) await startJob($, agentId, target)
        $.ui.invalidate('ui.render')
      }
    }

    const result = await next(e)
    // The foreman just wrote the plan: show it now, not at the next poll
    const path = typeof e.file_path === 'string' ? e.file_path : ''
    if (!e.agentId && path.endsWith(PLAN)) await refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const member = e.agentId ? crew.get(e.agentId) : undefined
    if (member && e.agentId) {
      member.isRunning = false
      await finishJob($, e.agentId, e.answer)
      $.ui.invalidate('ui.render')
    } else if (!e.agentId) {
      await refresh($)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || isHidden) return next(e)

    const band = bandModel(plan, [...crew.values()], await $.clock.now())
    if (!band) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const hide = (
      <Button
        key="hide"
        label="✕"
        plain
        dimColor
        onPress={() => {
          isHidden = true
          $.ui.invalidate('ui.render')
          $.ui.toast(`crewsade band hidden — /${COMMAND} show to bring it back`)
        }}
      />
    )

    // Every card has the same frame: a label with its summary on the right, a bold
    // main line, and a quiet second line; equal widths keep the band symmetric
    const card = (key: string, label: string, meta: unknown, main: unknown, sub: unknown) => (
      <Box
        key={key}
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        width={0}
        borderStyle="round"
        borderColor="subtle"
        paddingX={1}
      >
        <Box flexDirection="row" justifyContent="space-between" gap={1}>
          <Text color="subtle">{label}</Text>
          {meta}
        </Box>
        {main}
        {sub}
      </Box>
    )

    const filled = band.total ? Math.round((band.done / band.total) * BAR) : 0
    const missionCard =
      band.title === null
        ? null
        : card(
            'mission',
            'Mission',
            <Box flexDirection="row" gap={1}>
              <Text bold>
                {band.done}/{band.total}
              </Text>
              <Button key="tasks" label="Tasks" plain onPress={() => $.ui.open({ id: TASKS_PANE, title: 'Tasks' })} />
              <Button key="log" label="Log" plain onPress={() => $.ui.open({ id: LOG_PANE, title: 'Log' })} />
              {hide}
            </Box>,
            <Text bold wrap="truncate-end">
              {band.title}
            </Text>,
            <Box flexDirection="row">
              <Text backgroundColor="success">{' '.repeat(filled)}</Text>
              <Text backgroundColor="subtle">{' '.repeat(BAR - filled)}</Text>
            </Box>,
          )

    const alert = band.alert ? ALERT[band.alert.kind] : null
    const nowCard =
      band.title === null
        ? null
        : card(
            'now',
            band.current?.isNext ? 'Next' : 'Current',
            band.current && band.current.stage !== '' ? (
              <Text bold color={STAGE_COLOR[band.current.stage] ?? 'text'}>
                {band.current.stage}
              </Text>
            ) : null,
            <Text bold wrap="truncate-end">
              {band.current?.title ?? (band.alert ? band.alert.text : '—')}
            </Text>,
            alert && band.alert && band.current ? (
              <Text color={alert.color} wrap="truncate-end">
                {alert.glyph} {band.alert.text}
              </Text>
            ) : band.current && band.current.failed > 0 ? (
              <Text color="error">ตรวจไม่ผ่านไปแล้ว {band.current.failed} รอบ</Text>
            ) : (
              <Text color="subtle">ยังไม่มีปัญหา</Text>
            ),
          )

    const lead = band.crew[0]
    const crewCard = lead
      ? card(
          'crew',
          'Team',
          band.title === null ? (
            <Box flexDirection="row" gap={1}>
              <Text color="subtle">{lead.elapsed}</Text>
              {hide}
            </Box>
          ) : (
            <Text color="subtle">{lead.elapsed}</Text>
          ),
          <Box flexDirection="row" gap={1}>
            <Text color={ROLE_COLOR[lead.role]}>{SPIN[frame]}</Text>
            <Text>{ICON[lead.role]}</Text>
            <Text bold color={ROLE_COLOR[lead.role]}>
              {lead.count > 1 ? `${lead.role} ${lead.count} ตัว` : lead.role}
            </Text>
            {band.crew.length > 1 && <Text color="subtle">และอีก {band.crew.length - 1} งาน</Text>}
          </Box>,
          // The job on a line of its own, so it shows long; the sub-task is already on Current
          <Text wrap="truncate-end">{lead.count > 1 ? `${lead.job} · ${lead.subject}` : lead.job}</Text>,
        )
      : card(
          'crew',
          'Team',
          null,
          <Text color="subtle">ไม่มีใครทำงานอยู่</Text>,
          <Text color="subtle"> </Text>,
        )

    return (
      <Box flexDirection="row" gap={1}>
        {missionCard}
        {nowCard}
        {crewCard}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: TASKS_PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const tasks = tasksModel(plan, [...crew.values()], await $.clock.now())
    if (!tasks) return <Text color="subtle">ยังไม่มี mission — เริ่มด้วย /crewsade:foreman</Text>

    // The desktop draws it as one SVG image; it holds nothing that ticks, so it only
    // changes when the plan or the crew does
    if (e.surface === 'desktop') {
      const { Svg } = $.ui.resolve(e)
      const px = Math.max(240, Math.floor((e.props.bodyColumns ?? 40) * 7.6))
      const stats = Object.fromEntries(tasks.rows.map(r => [r.title, subTaskStats(log, tasks.title, r.title)]))
      const drawn = tasksSvg(tasks, px, stats)
      return (
        <Svg
          source={drawn.source}
          alt={`${tasks.title}: ${tasks.done}/${tasks.total} — ${tasks.rows.map(r => `${r.id}. ${r.title} (${r.step})`).join(', ')}`}
          width={px}
          height={drawn.height}
        />
      )
    }

    const width = Math.max(10, Math.min(24, (e.props.bodyColumns ?? 30) - 8))
    const filled = tasks.total ? Math.round((tasks.done / tasks.total) * width) : 0
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold wrap="wrap">
            {tasks.title}
          </Text>
          {tasks.doneWhen && (
            <Text color="subtle" wrap="wrap">
              {tasks.doneWhen}
            </Text>
          )}
        </Box>
        <Box flexDirection="row" gap={1}>
          <Box flexDirection="row">
            <Text backgroundColor="success">{' '.repeat(filled)}</Text>
            <Text backgroundColor="subtle">{' '.repeat(width - filled)}</Text>
          </Box>
          <Text bold>
            {tasks.done}/{tasks.total}
          </Text>
        </Box>
        <Box flexDirection="column" gap={1}>
          {tasks.rows.map(row =>
            row.step === 'current' || row.step === 'blocked' ? (
              <Box
                key={`task-${row.id}`}
                flexDirection="column"
                borderStyle="round"
                borderColor={row.step === 'blocked' ? 'error' : 'warning'}
                paddingX={1}
              >
                <Text bold wrap="wrap">
                  {STEP_MARK[row.step].glyph} {row.id}. {row.title}
                </Text>
                <Box flexDirection="row" gap={1} flexWrap="wrap">
                  {row.stage !== '' && chip(Text, row.stage, STAGE_COLOR[row.stage] ?? 'subtle')}
                  {row.failed > 0 && chip(Text, `ไม่ผ่าน ${row.failed} รอบ`, 'error')}
                </Box>
                {row.crew.map((member, i) => (
                  <Box key={`task-${row.id}-crew-${i}`} flexDirection="column" marginTop={1}>
                    <Box flexDirection="row" gap={1}>
                      <Text color={ROLE_COLOR[member.role]}>{SPIN[frame]}</Text>
                      <Text>{ICON[member.role]}</Text>
                      <Text bold color={ROLE_COLOR[member.role]}>
                        {member.role}
                      </Text>
                      <Text color="subtle">· {member.elapsed}</Text>
                    </Box>
                    <Box paddingLeft={2}>
                      <Text wrap="wrap">{member.job}</Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box key={`task-${row.id}`} flexDirection="row" gap={1} paddingX={1}>
                <Text color={STEP_MARK[row.step].color}>{STEP_MARK[row.step].glyph}</Text>
                <Text color={row.step === 'done' ? 'text' : 'subtle'} wrap="wrap">
                  {row.id}. {row.title}
                </Text>
                {row.failed > 0 && <Text color="subtle">· ไม่ผ่าน {row.failed} รอบ</Text>}
              </Box>
            ),
          )}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: LOG_PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (!plan) return <Text color="subtle">ยังไม่มี mission — เริ่มด้วย /crewsade:foreman</Text>
    const rows = logRows(log, plan.title)
    if (!rows.length) return <Text color="subtle">ยังไม่มีอะไรใน log ของ mission นี้</Text>

    // The desktop draws Svg: real cards, pills and type sizes. One cell is about 7.6 px
    // there; a little narrow is better than wide, which would scale the text down
    if (e.surface === 'desktop') {
      const { Svg } = $.ui.resolve(e)
      const width = Math.max(240, Math.floor((e.props.bodyColumns ?? 40) * 7.6))
      return (
        <Box flexDirection="column" gap={1}>
          {rows.map((row, i) => {
            const card = logCard(row, width)
            return (
              <Box key={`log-${i}`}>
                <Svg source={card.source} alt={`${row.who} ${row.time} ${row.text} ${row.outcome?.text ?? ''}`} width={width} height={card.height} />
              </Box>
            )
          })}
        </Box>
      )
    }

    // A timeline: each entry carries its agent's colour down the left, and wraps
    // instead of cutting off, so a narrow pane still shows everything
    return (
      <Box flexDirection="column" gap={1}>
        {rows.map((row, i) => (
          <Box
            key={`log-${i}`}
            flexDirection="column"
            borderStyle="quote"
            borderColor={row.role ? ROLE_COLOR[row.role] : 'subtle'}
            paddingLeft={1}
          >
            <Box flexDirection="row" justifyContent="space-between" gap={1}>
              <Box flexDirection="row" gap={1} flexShrink={1}>
                <Text>{row.icon}</Text>
                <Text bold color={row.role ? ROLE_COLOR[row.role] : 'text'}>
                  {row.who}
                </Text>
                <Text color="subtle">{row.time}</Text>
              </Box>
              {row.outcome && <Box flexShrink={0}>{chip(Text, row.outcome.text, row.outcome.tone)}</Box>}
            </Box>
            <Text wrap="wrap">{row.text}</Text>
            {row.details.map((detail, j) => (
              <Box key={`log-${i}-fix-${j}`} flexDirection="row" gap={1}>
                <Text color="error">•</Text>
                <Text color="error" wrap="wrap">
                  {detail}
                </Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
