---
name: change-requirement
description: Handle a requirement change on an existing Jira task — read all ticket docs and the codebase, grill the user until the change is fully clear, then propagate the update through every affected file (requirement, testing plan, implementation plan) with a change log entry in each.
disable-model-invocation: true
---

# Change Requirement

When a requirement changes mid-flight, this skill makes the change land consistently across the whole document chain — no file left describing the old world.

## Phase 1: Understand the change request

1. **Get the change description.** The user should describe what changed when invoking this skill (as the argument or in conversation). If they haven't, ask "requirement เปลี่ยนอะไรครับ" and STOP until they answer.
2. **Identify the task ID** (e.g. `LMP-4827`) from the conversation, the change description, or ask.

## Phase 2: Read everything

Read all of these before asking any question:

1. **Every file in the ticket folder.** Resolve `{vault root}` first: check `~/.lmp-skills/config.json` for a `vaultRoot` field and use it if present. Otherwise, use `~/Desktop/LMP/lmp-task-prd` if it exists, or ask the user once where their vault is if it doesn't — either way, save the resolved path into `~/.lmp-skills/config.json` under `vaultRoot` (create the file/folder if needed) so future runs, of this skill or any other in the pipeline, read the cache instead of asking again. Read everything in `{vault root}/tickets/{TASK-ID}/`:
   - `grill.md` — decisions already made (don't re-ask them)
   - `requirement.md`, `implementation-plan.md`, `testing-plan.md`
   - `test-results/` — the latest round tells you what already passed and may break
2. **The Jira ticket** via Atlassian MCP (`getJiraIssue`) — the change may already be described in a comment or updated description.
3. **The codebase** — especially the parts already built for this task. What has been implemented already matters: a change to shipped code costs more than a change to un-started work, and the grill should surface that.

Then map the **blast radius**: which FRs, business rules, edge cases, TCs, APIs, models, and pages does this change touch? Which existing grill decisions does it contradict? Present this impact summary to the user briefly before grilling.

## Phase 3: Grill the change

Run a `/grilling`-style session scoped to the change until it is fully clear:

- Ask **one question at a time**, with your recommended answer for each. Wait for the user's answer before the next question.
- Facts come from the docs/codebase; only *decisions* go to the user.
- Focus areas: what exactly the new behavior is, what happens to the old behavior (removed? kept behind a condition?), conflicts with prior grill decisions, impact on already-implemented code, and whether scope items move in/out.
- Keep a verbatim record of every Q&A.
- Do not start updating files until the user confirms the change is fully understood.

## Phase 4: Propagate the change to every affected file

Update each affected file in place, keeping its original template and style. Rules that apply to all files:

- **Never renumber existing IDs.** FR/TC ids are stable references (test results and specs point at them). A removed item is marked `~~FR-03~~ (ยกเลิก — ดู Change Log)`, a changed item keeps its id, new items get the next unused id.
- **Every updated file gets a change log entry.** Each file has a `## Change Log` section at the bottom (create it on first change), with entries newest-first:

```markdown
## Change Log

### {YYYY-MM-DD} — CR-{NN}: {ชื่อการเปลี่ยนแปลงสั้น ๆ}
- FR-03: เดิม "{ข้อความเดิม}" → เปลี่ยนเป็น "{ข้อความใหม่}" (เหตุผล: {ทำไม})
- FR-09: เพิ่มใหม่ — {สรุปสั้น}
- TC-07: ยกเลิก เพราะ {เหตุผล}
```

  `CR-{NN}` is the change-request number for this task — count existing CR entries across the ticket's change logs to pick the next one. Every entry must say **เปลี่ยนอะไร → เป็นอะไร** (before → after), not just "updated".

Files to update:

1. **`grill.md`** — append the change-grill Q&A under a heading `## Change Request CR-{NN} — {YYYY-MM-DD}`, same `Question N / Answer` format as the original session.
2. **`requirement.md`** — revise FRs, scope, actors, business rules, edge cases to describe the NEW truth (the body always reads as current — history lives only in the Change Log).
3. **`testing-plan.md`** — add/revise/cancel TCs to match, keep traceability complete (every changed FR still has ≥1 TC), and flag TCs that previously passed but must be **re-tested** because this change touches them.
4. **`implementation-plan.md`** — revise APIs/models/pages, and distinguish clearly between "ยังไม่ได้ทำ แก้ plan เฉย ๆ" and "ทำไปแล้ว ต้องแก้โค้ดเดิม" (based on what Phase 2 found in the codebase). Update the work order accordingly.
5. Any other file in the ticket folder that describes the changed behavior (prd.md etc.) — same treatment.

Do not update `test-results/` history — past rounds are records of what happened, not living documents.

## Phase 5: Report

Tell the user: the CR number, which files were updated with a one-line summary each, which previously-passing TCs need re-testing, and whether already-written code needs rework. Suggest the natural next step — usually re-running `/jira-testing` after the code catches up — and stop.
