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
- **ทุก Business Rule (`BR-xx`) และทุก Edge Case (`EC-xx`)** ใน requirement มีอย่างน้อย 1 TC
- ถ้าข้อไหนยังไม่มี — เพิ่ม TC จนครบ ห้ามข้าม

### กติกาการเขียนให้คนอ่านจริง (Readability)

คนอ่านเอกสารแบบ **สแกน ไม่ได้อ่านทีละบรรทัด** — เขียนให้จับใจความได้ใน 30 วินาที แล้วค่อยเจาะ:

- **เปิดหัวเอกสารด้วยกล่อง TL;DR เสมอ** (`> [!summary]`) ตอบให้ครบว่า เรื่องอะไร / ใหญ่แค่ไหน (เป็นตัวเลข) / ต้องทำอะไรต่อ
- **ตาราง > ย่อหน้า** ทุกครั้งที่ข้อมูลขนานกัน — ถ้า bullet หน้าตาซ้ำกัน 3 ข้อขึ้นไป มันควรเป็นตาราง
- **1 bullet = 1 บรรทัด** (ยาวสุด 2) ขึ้นต้นด้วย**คำสำคัญตัวหนา** แล้วค่อยขยาย
- **ย่อหน้าห้ามเกิน 3 บรรทัด** เกินเมื่อไหร่แตกเป็น bullet หรือตาราง
- **ตัวเลข/ค่าจริงใส่ backtick** เช่น `10,000 rows`, `HTTP 403` ให้ตาสะดุดตอนสแกน
- **รายละเอียดยาวที่ไม่ได้อ่านทุกครั้ง ห่อด้วย `<details>`** — ข้างนอกสรุป 1 บรรทัด ข้างในของเต็ม (Obsidian render ได้, editor อื่นก็ยังอ่านออก)
- **ห้ามลดเนื้อหาเพื่อให้สั้น** — ย้าย ยุบ ซ่อน จัดกลุ่ม ได้หมด แต่ข้อมูลต้องครบเท่าเดิม ที่ต้องการคือ *สั้นเมื่อมอง* ไม่ใช่ *น้อยลง*
- **emoji ใช้เป็น marker** ของสถานะ/ระดับได้ (`🔴 Must`, `✅`, `❌`) ห้ามใช้ประดับเล่น

### Template

```markdown
# Testing Plan — {TASK-ID} | {ชื่อฟีเจอร์}

> [!summary] สรุป 30 วินาที
> - **เทสอะไร:** {1 ประโยค}
> - **จำนวนเคส:** `{total}` TC — E2E `{a}` · Functional `{b}` · Edge `{c}` · Regression `{d}` · Permission/อื่น ๆ `{e}`
> - **ฟีเจอร์เดิมที่ต้องเฝ้า:** {ชื่อฟีเจอร์ที่ share code ด้วย}
> - **เทสบน:** {environment} · อิง requirement ณ `{YYYY-MM-DD}`
> - **ต้องเตรียมก่อน:** {account/role + data ตั้งต้น แบบสั้นที่สุด}

## ข้อมูลเตรียมก่อนเทส (Preconditions)

| สิ่งที่ต้องมี | รายละเอียด |
|---|---|
| Account | {role + สิทธิ์ที่ต้องมี} |
| ข้อมูลตั้งต้น | {seed data ที่ต้องมีในระบบ} |
| Config | {feature flag / env} |

## รายการทดสอบ

### 1. E2E Flow `{a}` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-01 | {flow เต็มของ actor หลัก ตั้งแต่ต้นจนจบ} | {ผลลัพธ์ที่ต้องเห็น} | FR-01, FR-02 |

### 2. Functional Cases `{b}` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-05 | {พฤติกรรมย่อยรายข้อ} | {...} | FR-03 |

### 3. Edge Cases `{c}` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-12 | {เคสขอบ} | {ผลลัพธ์ที่ชัดเจน ห้ามเว้นว่าง} | EC-02 |

### 4. Regression — ฟีเจอร์ที่กระทบ `{d}` เคส

| TC | ฟีเจอร์ | share อะไรกับงานนี้ | คาดหวัง |
|---|---|---|---|
| TC-20 | {ชื่อฟีเจอร์เดิม} | {API/ตาราง/component ที่ใช้ร่วมกัน} | ยังทำงานเหมือนเดิมทุกอย่าง |

### 5. Permissions & อื่น ๆ `{e}` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-25 | {สิทธิ์ราย role / security / performance} | {...} | FR-01 |

<details>
<summary>ขั้นตอนละเอียดของเคสที่ทำตามยาก ({TC ids})</summary>

**TC-XX** — {ชื่อเคส}
1. {step}
2. {step}

</details>

## ตาราง Traceability

| Requirement | TC ที่ครอบคลุม |
|---|---|
| FR-01 | TC-01, TC-12, TC-25 |
| BR-01 | TC-04 |
| EC-02 | TC-13 |

## สิ่งที่เทสอัตโนมัติครอบคลุมแล้ว

| TC | ครอบคลุมโดย | path |
|---|---|---|
| TC-06 | unit test เดิม | `{path}` |

{ถ้าไม่มีให้ตัด section นี้ทิ้ง}
```

Formatting rules:

- Number TCs sequentially across the whole document (`TC-01, TC-02, ...`) — one behavior per TC, ชื่อเคสอ่านแล้วรู้ทันทีว่าเทสอะไร
- คอลัมน์ "อ้างอิง" ต้องชี้ id จริงใน requirement (`FR-03`, `BR-01`, `EC-02`) — regression ชี้ชื่อฟีเจอร์ที่กระทบแทน
- **คอลัมน์ "คาดหวัง" ห้ามเว้นว่าง** — QA ต้องตัดสินผ่าน/ไม่ผ่านได้โดยไม่ต้องถามใคร
- ขั้นตอน reproduce ที่ยาวเกิน 1 บรรทัด อย่ายัดลงตาราง ให้ไปอยู่ใน `<details>` ท้าย section แล้วอ้าง TC id
- **ห้ามตัดเคสเพื่อให้สั้น** — เคสเยอะแปลว่าทำถูกแล้ว ความอ่านง่ายมาจากตารางกับหัวข้อที่มีตัวเลขกำกับ ไม่ใช่จากการมีเคสน้อยลง

### Example (register to aim for)

```markdown
# Testing Plan — QA-482 | ส่งออกออเดอร์เป็น CSV แบบกลุ่ม

> [!summary] สรุป 30 วินาที
> - **เทสอะไร:** export ออเดอร์เป็น CSV แบบกลุ่มจากหน้า Orders list
> - **จำนวนเคส:** `13` TC — E2E `3` · Functional `4` · Edge `4` · Regression `1` · Permission `1`
> - **ฟีเจอร์เดิมที่ต้องเฝ้า:** ตัวกรองหน้า Orders list (ใช้ query builder ตัวเดียวกัน)
> - **เทสบน:** staging · อิง requirement ณ `2026-09-11`
> - **ต้องเตรียมก่อน:** account `staff`, `viewer` + ออเดอร์อย่างน้อย `10,001` รายการ

## รายการทดสอบ

### 1. E2E Flow `3` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-01 | export ทั้งหมดด้วยคอลัมน์เริ่มต้น ตั้งแต่กดปุ่มจนได้ไฟล์ | ได้ไฟล์ CSV ครบทุกแถวตามที่เห็นบนหน้าจอ | FR-01, FR-02 |
| TC-02 | export โดยเลือกคอลัมน์เอง | ไฟล์มีเฉพาะคอลัมน์ที่เลือก เรียงตาม panel | FR-02 |
| TC-03 | export ขณะเปิดตัวกรองสถานะ + ช่วงวันที่ | ไฟล์มีเฉพาะออเดอร์ที่ตรงตัวกรอง | FR-03 |

### 3. Edge Cases `4` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-05 | export ออเดอร์เกิน `10,000` รายการ | มี progress indicator, UI ไม่ค้าง, ไฟล์ครบทุกแถว | EC-04 |
| TC-07 | export ตอนไม่มีออเดอร์ตรงเงื่อนไข | ขึ้น empty-state ไม่ดาวน์โหลดไฟล์ | EC-01 |
| TC-11 | ยิง export พร้อมกันจากสองแท็บ | ทั้งสองไฟล์ถูกต้อง ไม่ชนกัน | BR-02 |
| TC-13 | ช่วงวันที่คาบเกี่ยวขอบ UTC | ออเดอร์ตกวันที่ถูกต้อง | EC-02 |

### 4. Regression — ฟีเจอร์ที่กระทบ `1` เคส

| TC | ฟีเจอร์ | share อะไรกับงานนี้ | คาดหวัง |
|---|---|---|---|
| TC-20 | ตัวกรองหน้า Orders list | `buildOrderQuery()` ตัวเดียวกับที่ export เรียก | กรองแล้วได้ผลเท่าเดิมทุกเงื่อนไข |

### 5. Permissions & อื่น ๆ `1` เคส

| TC | เทสอะไร | คาดหวัง | อ้างอิง |
|---|---|---|---|
| TC-12 | เข้าด้วย role `viewer` | ไม่เห็นปุ่ม Export และยิง API ตรงได้ `HTTP 403` | FR-01 |
```

## Phase 3: Save and report

1. Save to `{vault root}/tickets/{TASK-ID}/testing-plan.md`. If the file already exists, overwrite it but tell the user you replaced a previous version.
2. Report to the user: the TL;DR box verbatim (total TC count, count per section), which impacted features got regression cases, and any requirement item that was hard to make testable (so they can push back on the requirement if needed).
