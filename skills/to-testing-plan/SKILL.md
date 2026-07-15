---
name: to-testing-plan
description: Read the requirement document (from /to-jira-requirement) plus all ticket context and the current codebase, then produce the most exhaustive testing plan possible — full e2e flows, small cases, edge cases, and regression on impacted features — and save it to the Obsidian vault ticket folder.
disable-model-invocation: true
---

# To Testing Plan

This skill turns a requirement document into an exhaustive testing plan. The goal is **completeness, not brevity** — do not limit the number of test cases; the measure of success is that the fewest possible bugs escape to production. Do NOT interview the user.

## Phase 1: Gather sources

1. **Identify the task ID** (e.g. `LMP-4827`) from the conversation or the skill argument. Ask only if there is truly no trace of it.
2. **Read everything in the ticket folder.** Resolve `{vault root}` first: check `~/.lmp-skills/config.json` for a `vaultRoot` field and use it if present. Otherwise, use `~/Desktop/LMP/lmp-task-prd` if it exists, or ask the user once where their vault is if it doesn't — either way, save the resolved path into `~/.lmp-skills/config.json` under `vaultRoot` (create the file/folder if needed) so future runs, of this skill or any other in the pipeline, read the cache instead of asking again. Read `{vault root}/tickets/{TASK-ID}/`:
   - `requirement.md` — the primary source. If it doesn't exist, stop and tell the user to run `/to-jira-requirement` first.
   - `grill.md` and every other file (prd.md, implementation-plan.md, ...) — decisions and edge cases sometimes appear here that didn't make it into the requirement; they still need test coverage.
3. **Read the Jira ticket** via Atlassian MCP (`getJiraIssue`) if not already in context — acceptance criteria and comments often contain extra test-worthy details.
4. **Explore the current codebase** — this step is what makes the regression section possible, so do it thoroughly (use subagents for breadth):
   - The code paths the feature touches: what actually exists today, actual roles/permissions, actual states/statuses, actual validation rules.
   - **Neighboring features that share code** with this change (same module, same API, same table, same component) — these are the regression candidates.
   - Existing automated tests in the area, so the plan can say what is already covered vs. what QA must test manually.

## Phase 2: Write the testing plan

Write in **Thai** with technical terms in English, same register as the example below. Written primarily for QA to execute, but Developers and PM must be able to read it too.

### Coverage requirements

The plan MUST cover all of these dimensions — work through them in order and let each one generate cases:

1. **E2E flows** — ทั้ง flow การทำงานจริงของผู้ใช้ตั้งแต่ต้นจนจบ ทุก actor, ทุก entry point, ทั้ง happy path และ unhappy path
2. **เคสเล็ก ๆ (functional cases)** — พฤติกรรมย่อยรายข้อจาก FR ทุกข้อ: validation, ค่า default, ข้อความ error, สถานะปุ่ม/UI, format ของข้อมูล
3. **Edge cases** — ทุกเคสจาก section "เคสที่ต้องพิจารณา" ใน requirement บวกเคสที่พบเพิ่มจากการอ่าน codebase (boundary values, empty/0/null, ข้อมูลปริมาณมาก, timezone, อักขระพิเศษ, การกดซ้ำ/พร้อมกัน, network ล้มเหลวกลางทาง)
4. **Regression — ฟีเจอร์อื่นที่กระทบ** — ทุกฟีเจอร์ที่ share code/API/ตาราง/component กับงานนี้ (ที่พบใน Phase 1) ต้องมีเคสยืนยันว่ายังทำงานปกติ ระบุชื่อฟีเจอร์และจุดที่ share กันให้ชัด
5. **เคสอื่น ๆ ที่ควรเทส** — permissions/สิทธิ์ทุก role (รวม role ที่ต้อง "ไม่เห็น/ทำไม่ได้"), ความปลอดภัยพื้นฐาน (เรียก API ตรงโดยไม่มีสิทธิ์), performance ตามตัวเลขใน requirement, ความถูกต้องของข้อมูลหลัง refresh/reload

### Traceability check (บังคับ)

Before finishing, verify:

- **ทุก FR** ใน requirement มีอย่างน้อย 1 TC อ้างถึง
- **ทุก Business Rule และทุก Edge Case** ใน requirement มีอย่างน้อย 1 TC
- ถ้าข้อไหนยังไม่มี — เพิ่ม TC จนครบ ห้ามข้าม

### Template

```markdown
# Testing Plan — {TASK-ID} | {ชื่อฟีเจอร์}

{ย่อหน้าสรุป: plan นี้ครอบคลุมอะไรบ้าง อิงจาก requirement เวอร์ชันไหน/วันไหน สภาพแวดล้อมที่ใช้เทส และข้อจำกัดที่ควรรู้}

## ข้อมูลเตรียมก่อนเทส (Preconditions)

- {บัญชีผู้ใช้/role ที่ต้องมี, ข้อมูลตั้งต้น, feature flag, environment ที่ใช้}

## รายการทดสอบ

### E2E Flow

- **TC-01** {ชื่อเคส — flow เต็มของ actor หลัก} `[FR-01, FR-02]`
  - คาดหวัง: {ผลลัพธ์ที่ต้องเห็น}
- **TC-02** ...

### Functional Cases

- **TC-05** {เคสย่อยรายพฤติกรรม} `[FR-03]`
- ...

### Edge Cases

- **TC-12** {เคสขอบ พร้อมผลลัพธ์ที่คาดหวังชัดเจน} `[FR-04]`
- ...

### Regression — ฟีเจอร์ที่กระทบ

- **TC-20** {ฟีเจอร์ X ยังทำงานปกติ — ระบุจุดที่ share code กับงานนี้}
- ...

### Permissions & อื่น ๆ

- **TC-25** {สิทธิ์แต่ละ role / security / performance} `[FR-01]`
- ...

## ตาราง Traceability

| Requirement | TC ที่ครอบคลุม |
|---|---|
| FR-01 | TC-01, TC-12, TC-25 |
| FR-02 | TC-01, TC-05 |
| Edge: {ชื่อเคส} | TC-12 |

## สิ่งที่เทสอัตโนมัติครอบคลุมแล้ว

- {test อัตโนมัติที่มีอยู่ใน codebase ที่คัฟเวอร์บางเคสแล้ว พร้อม path — ถ้าไม่มีให้ตัด section นี้ทิ้ง}
```

Formatting rules:

- Number TCs sequentially across the whole document (`TC-01, TC-02, ...`) — one behavior per TC, ชื่อเคสต้องอ่านแล้วรู้ทันทีว่าเทสอะไร
- Tag each TC with the FR/Business Rule it covers in backticks (`[FR-03]`); regression TCs tag the impacted feature name instead
- Add a `คาดหวัง:` line whenever the expected result is not obvious from the case name — edge cases almost always need it
- ห้ามตัดเคสเพื่อให้สั้น — ถ้าเคสเยอะแปลว่าทำถูกแล้ว

### Example (register to aim for)

```markdown
# Testing Plan — QA-482 | ส่งออกออเดอร์เป็น CSV แบบกลุ่ม

ครอบคลุมการส่งออก CSV แบบกลุ่มจากหน้ารายการออเดอร์ ทั้งการเลือกคอลัมน์ การส่งออกแบบกรองข้อมูล ชุดข้อมูลขนาดใหญ่ และเคสขอบด้านโลเคล/ไทม์โซน อิงจาก requirement.md ณ วันที่จัดทำ เทสบน staging

## รายการทดสอบ

### E2E Flow

- **TC-01** ส่งออกออเดอร์ทั้งหมดด้วยคอลัมน์เริ่มต้น ตั้งแต่กดปุ่มจนได้ไฟล์ `[FR-01, FR-02]`
- **TC-02** ส่งออกโดยเลือกคอลัมน์เอง `[FR-02]`
- **TC-03** การส่งออกเป็นไปตามตัวกรองสถานะ/วันที่ที่ใช้งานอยู่ `[FR-03]`

### Functional Cases

- **TC-04** ปุ่มส่งออกถูกปิดใช้งานระหว่างที่การส่งออกก่อนหน้ายังทำงานอยู่ `[BR: กันกดซ้ำ]`
- **TC-06** ค่าที่มีจุลภาคใน CSV ถูกครอบด้วยเครื่องหมายคำพูดอย่างถูกต้อง `[FR-06]`
- **TC-08** ค่าสกุลเงินถูกส่งออกด้วยทศนิยม 2 ตำแหน่ง `[FR-07]`
- **TC-10** การส่งออกทำให้เกิดการดาวน์โหลด ไม่ใช่การเปิดแท็บใหม่ `[FR-02]`

### Edge Cases

- **TC-05** ส่งออกออเดอร์มากกว่า 10,000 รายการโดยไม่บล็อก UI thread `[FR-05]`
  - คาดหวัง: มี progress indicator, UI ยังใช้งานได้, ไฟล์ครบทุกแถว
- **TC-07** ส่งออกเมื่อไม่มีออเดอร์ที่ตรงเงื่อนไขจะแสดงข้อความ empty-state `[FR-04]`
- **TC-11** คำขอส่งออกพร้อมกันจากสองแท็บไม่ชนกัน `[BR: export พร้อมกัน]`
- **TC-13** การส่งออกช่วงวันที่ที่คาบเกี่ยวขอบเขตวัน UTC จัดเข้าวันที่ถูกต้อง `[Edge: UTC boundary]`

### Permissions & อื่น ๆ

- **TC-12** ตรวจสอบสิทธิ์: บทบาท viewer มองไม่เห็นปุ่มส่งออก `[FR-01]`
```

## Phase 3: Save and report

1. Save to `{vault root}/tickets/{TASK-ID}/testing-plan.md`. If the file already exists, overwrite it but tell the user you replaced a previous version.
2. Report to the user: total TC count, count per section, which impacted features got regression cases, and any requirement item that was hard to make testable (so they can push back on the requirement if needed).
