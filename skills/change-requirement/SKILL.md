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

Then map the **blast radius** and show it to the user as a table before grilling — สแกนได้ในสิบวินาที ไม่ใช่ย่อหน้ายาว:

| ไฟล์/ส่วน | กระทบอะไร | ระดับ |
|---|---|---|
| requirement.md | FR-03, FR-09, EC-02 | 🔴 ต้องแก้ |
| testing-plan.md | TC-07, TC-12 (ต้องเทสซ้ำ) | 🟠 แก้บางส่วน |
| implementation-plan.md | API #2, หน้า Orders | 🔴 ทำไปแล้ว ต้องรื้อ |
| grill.md | ขัดกับคำตอบ Q4 รอบ 2 | 🟡 ต้องเคลียร์ในการกริล |

บอกด้วย 1 บรรทัดว่าอะไร**ทำไปแล้ว**และอะไร**ยังไม่ได้เริ่ม** — ต้นทุนของการเปลี่ยนต่างกันคนละเรื่อง

## Phase 3: Grill the change

Run a `/grilling`-style session scoped to the change until it is fully clear — same **design tree / rounds / frontier** model as `/grill-jera-task`:

- Ask the **whole frontier in one round** (ทุกคำถามที่ prerequisite เคลียร์แล้ว) พร้อมคำแนะนำรายข้อ แล้วรอคำตอบก่อนไปรอบถัดไป คำถามที่ยังขึ้นกับคำตอบในรอบนี้ ให้ไปรอบถัดไป
- Format แต่ละรอบแบบเดียวกัน:

```
❓ **Q1** - **<question title>**: <question body>

➡️ <your recommended answer>
```

- Facts มาจาก docs/codebase เสมอ (ใช้ sub-agent หาแบบไม่ block) — ให้ user ตัดสินเฉพาะ *decisions*
- Focus areas: พฤติกรรมใหม่คืออะไรแน่ ๆ, ของเดิมจะเป็นยังไง (ลบ? เก็บไว้หลังเงื่อนไข?), ขัดกับคำตอบใน grill เดิมข้อไหน, กระทบโค้ดที่ทำไปแล้วแค่ไหน, มีอะไรเข้า/ออกสโคป
- Keep a verbatim record of every round (question title, question, recommendation, answer)
- จบเมื่อ frontier ว่าง และห้ามเริ่มแก้ไฟล์จนกว่า user จะยืนยันว่าเข้าใจตรงกัน

## Phase 4: Propagate the change to every affected file

Update each affected file in place, keeping its original template and style. Rules that apply to all files:

- **Never renumber existing IDs.** FR/TC ids are stable references (test results and specs point at them). A removed item is marked `~~FR-03~~ (ยกเลิก — ดู Change Log)`, a changed item keeps its id, new items get the next unused id.
- **Every updated file gets a change log entry.** Each file has a `## Change Log` section at the bottom (create it on first change), with entries newest-first — เขียนเป็นตารางให้เทียบ เดิม→ใหม่ ได้ในแถวเดียว:

```markdown
## Change Log

### {YYYY-MM-DD} — CR-{NN}: {ชื่อการเปลี่ยนแปลงสั้น ๆ}

> [!info] {สรุปการเปลี่ยนทั้งก้อนใน 1 บรรทัด — คนที่อ่านแค่บรรทัดนี้ต้องเข้าใจว่าเกิดอะไรขึ้น}

| ID | เดิม | ใหม่ | เหตุผล |
|---|---|---|---|
| FR-03 | {ข้อความเดิม} | {ข้อความใหม่} | {ทำไม} |
| FR-09 | — | เพิ่มใหม่: {สรุปสั้น} | {ทำไม} |
| TC-07 | {เดิม} | ❌ ยกเลิก | {ทำไม} |
```

  `CR-{NN}` is the change-request number for this task — count existing CR entries across the ticket's change logs to pick the next one. Every entry must say **เปลี่ยนอะไร → เป็นอะไร** (before → after), not just "updated".

Files to update:

1. **`grill.md`** — append the change-grill Q&A under a heading `## Change Request CR-{NN} — {YYYY-MM-DD}`, same round-by-round format as the original session (`### Q1 — {title}` + `➡️ คำแนะนำ` + `✅ คำตอบ`).
2. **`requirement.md`** — revise FRs, scope, actors, business rules, edge cases to describe the NEW truth (the body always reads as current — history lives only in the Change Log).
3. **`testing-plan.md`** — add/revise/cancel TCs to match, keep traceability complete (every changed FR still has ≥1 TC), and flag TCs that previously passed but must be **re-tested** because this change touches them.
4. **`implementation-plan.md`** — revise APIs/models/pages, and distinguish clearly between "ยังไม่ได้ทำ แก้ plan เฉย ๆ" and "ทำไปแล้ว ต้องแก้โค้ดเดิม" (based on what Phase 2 found in the codebase). Update the work order accordingly.
5. Any other file in the ticket folder that describes the changed behavior (prd.md etc.) — same treatment.

**Readability ต้องไม่ถอยหลัง.** ไฟล์ที่แก้ต้องยังอ่านแบบสแกนได้เหมือนตอนสร้าง:

- **อัปเดตกล่อง TL;DR (`> [!summary] สรุป 30 วินาที`) ทุกไฟล์ที่แก้** — ตัวเลข (จำนวน FR/TC/API) และบรรทัด "ไม่ทำในงานนี้" ต้องตรงกับเนื้อในใหม่เสมอ
- ถ้าไฟล์เก่ายังไม่มีกล่อง `สรุป 30 วินาที` หรือยังเป็นย่อหน้า/bullet ยาว ๆ ให้**ยกเครื่องส่วนนั้นเป็นตาราง + กล่อง TL;DR ไปเลย** ระหว่างที่แก้ (เนื้อหาเท่าเดิม แค่จัดใหม่)
- ของที่เปลี่ยนเยอะจนตารางหลักรก ให้ย้ายรายละเอียดลง `<details>` แทนที่จะปล่อยให้ตารางยาวจนไม่มีใครอ่าน

Do not update `test-results/` history — past rounds are records of what happened, not living documents.

## Phase 5: Report

Tell the user (เป็นตารางถ้าเกิน 3 บรรทัด): the CR number, which files were updated with a one-line summary each, which previously-passing TCs need re-testing, and whether already-written code needs rework. Suggest the natural next step — usually re-running `/jira-testing` after the code catches up — and stop.
