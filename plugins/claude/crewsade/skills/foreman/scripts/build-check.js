export const meta = {
  name: 'crewsade-build-check',
  description: 'Build and check one crewsade sub-task: the maker writes, the auditor checks, and a failed audit goes back for a fix round until it passes or two rounds fail',
}

// Launched by the foreman skill: Workflow({ scriptPath, args }) with
//   args = {
//     id, subject, reportDir,
//     maker:   { role?: 'developer' | 'worker', brief },
//     auditor: { brief },
//     maxFailedRounds?: 2,
//   }
// id         — the sub-task's id in plan.md; subject — its title; reportDir — <mission>/reports
// maker.brief and auditor.brief are the full briefs for round 1. A fix round or a re-audit
// reuses them and adds what the last round found. Each round is a phase of its own, and
// every round's verdict is logged, so the whole cycle reads off the progress tree.
//
// Returns { outcome, rounds }. outcome is one of:
//   pass | needs-human   the audit did not fail: the foreman checks and moves on
//   stuck                the audit failed maxFailedRounds times: the foreman stops and asks
//   maker-stopped        the maker ended partial or needs-input: the foreman reads why
//   silent               an agent returned nothing: the foreman finds out why

const { id, subject, reportDir, maker, auditor, maxFailedRounds = 2 } = args ?? {}

if (!id || !subject || !reportDir || !maker?.brief || !auditor?.brief) {
  throw new Error('args needs id, subject, reportDir, maker.brief and auditor.brief')
}
const makerRole = maker.role ?? 'developer'
if (makerRole !== 'developer' && makerRole !== 'worker') throw new Error(`maker.role must be developer or worker, got "${makerRole}"`)

const verdictOf = text => text?.match(/^VERDICT:\s*(PASS|FAIL|NEEDS-HUMAN)/im)?.[1].toUpperCase() ?? null
const statusOf = text => text?.match(/^STATUS:\s*(done|partial|needs-input)/im)?.[1].toLowerCase() ?? null

// The items under the auditor's `FIX:` line, up to the next `KEY:` line
function fixesOf(text) {
  const lines = (text ?? '').split('\n')
  const at = lines.findIndex(line => /^FIX:/i.test(line))
  if (at < 0) return []
  const items = []
  const first = lines[at].replace(/^FIX:\s*/i, '').trim()
  if (first.startsWith('- ')) items.push(first.slice(2).trim())
  for (const line of lines.slice(at + 1)) {
    if (/^[A-Z][A-Z-]+:/.test(line)) break
    if (line.trim().startsWith('- ')) items.push(line.trim().slice(2).trim())
  }
  return items
}
const titleOf = fix => fix.split(':')[0].trim()

const rounds = []
const result = outcome => ({ outcome, rounds })

const runMaker = (round, fixes) => {
  const isFix = round > 1
  const brief = isFix
    ? `${maker.brief}\n\n## Fix round ${round - 1}\n` +
      `The auditor failed round ${round - 1}. Its FIX items:\n${fixes.map(f => `- ${f}`).join('\n')}\n\n` +
      `Fix the ones that name a failure you can reproduce or a DoD or AC they break. An item that ` +
      `contradicts the decision log or the approved plan is not yours to fix: do not work around it, ` +
      `end with STATUS: needs-input and say which item and why. Anything you leave unfixed, say under ` +
      `ASSUMPTIONS. Read the earlier reports in ${reportDir}/ first.\n` +
      `Write this round's report to ${reportDir}/${id}-${makerRole}-${round}.md`
    : maker.brief
  return agent(brief, {
    label: `${makerRole} · ${isFix ? `แก้ตามผลตรวจ (${fixes.length} ข้อ)` : makerRole === 'developer' ? 'เขียนโค้ด' : 'ทำงาน'} · ${subject}`,
    phase: isFix ? `แก้ตามผลตรวจ · รอบ ${round - 1}` : makerRole === 'developer' ? 'เขียนโค้ด' : 'ทำงาน',
    agentType: `crewsade:${makerRole}`,
  })
}

const runAuditor = (round, lastFixes) => {
  const brief =
    round > 1
      ? `${auditor.brief}\n\n## Re-audit, round ${round}\n` +
        `A maker fixed the last audit's FIX items:\n${lastFixes.map(f => `- ${f}`).join('\n')}\n` +
        `Check each one is fixed, and run every DoD command and AC again: a fix can break what passed.\n` +
        `Write this round's report to ${reportDir}/${id}-auditor-${round}.md`
      : auditor.brief
  return agent(brief, {
    label: `auditor · ${round > 1 ? `ตรวจซ้ำ รอบ ${round}` : 'ตรวจงานที่ maker ทำมา'} · ${subject}`,
    phase: `ตรวจงาน · รอบ ${round}`,
    agentType: 'crewsade:auditor',
  })
}

let fixes = []
for (let round = 1; ; round++) {
  const made = await runMaker(round, fixes)
  const entry = { round, maker: made ?? null, audit: null, verdict: null, fixes: [] }
  rounds.push(entry)
  if (made == null) {
    log(`รอบ ${round}: ${makerRole} ไม่ส่งอะไรกลับ`)
    return result('silent')
  }
  const status = statusOf(made)
  if (status !== 'done') {
    log(`รอบ ${round}: ${makerRole} จบที่ ${status ?? 'ไม่ระบุ STATUS'} — ส่งให้ foreman อ่านก่อนตรวจ`)
    return result('maker-stopped')
  }
  log(`รอบ ${round}: ${makerRole} ทำเสร็จ ส่งให้ auditor ตรวจ`)

  const audit = await runAuditor(round, fixes)
  entry.audit = audit ?? null
  if (audit == null) {
    log(`รอบ ${round}: auditor ไม่ส่งอะไรกลับ`)
    return result('silent')
  }
  entry.verdict = verdictOf(audit)
  entry.fixes = fixesOf(audit)

  if (entry.verdict === 'PASS' || entry.verdict === 'NEEDS-HUMAN') {
    log(`รอบ ${round}: ${entry.verdict === 'PASS' ? 'ผ่าน ✓' : 'ไม่มีข้อที่ไม่ผ่าน เหลือข้อที่ต้องให้คนตรวจ'}`)
    return result(entry.verdict === 'PASS' ? 'pass' : 'needs-human')
  }
  if (entry.verdict !== 'FAIL') {
    log(`รอบ ${round}: auditor ตอบโดยไม่มี VERDICT ที่อ่านได้ — ส่งให้ foreman`)
    return result('silent')
  }

  log(`รอบ ${round}: ไม่ผ่าน ${entry.fixes.length} ข้อ — ${entry.fixes.map(titleOf).join(' / ') || '(ไม่มีรายการ FIX)'}`)
  if (round >= maxFailedRounds) {
    log(`ตรวจไม่ผ่านครบ ${maxFailedRounds} รอบ — หยุดให้ foreman ถามผู้ใช้`)
    return result('stuck')
  }
  if (entry.fixes.length === 0) return result('stuck')
  fixes = entry.fixes
}
