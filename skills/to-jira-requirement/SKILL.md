---
name: to-jira-requirement
description: Turn grill session data into the most detailed requirement document possible — readable by QA, Developer, and PM alike — and save it to the Obsidian vault ticket folder. No interview, just synthesis of the grill Q&A, the Jira ticket, and the codebase.
disable-model-invocation: true
---

# To Jira Requirement

This skill takes grill session data (from `/grill-jera-task`) and produces the most detailed requirement document you can write. Do NOT interview the user — just synthesize what you already know. If something is genuinely unknowable from the sources below, record it in the "คำถามค้าง" section instead of asking.

## Phase 1: Gather sources

1. **Identify the task ID** (e.g. `LMP-4827`). Take it from the current conversation, the skill argument, or ask the user for it if there is truly no trace of it — that's the only question allowed.
2. **Load the grill data** — the primary source. Resolve `{vault root}` first: check `~/.lmp-skills/config.json` for a `vaultRoot` field and use it if present. Otherwise, use `~/Desktop/LMP/lmp-task-prd` if it exists, or ask the user once where their vault is if it doesn't — either way, save the resolved path into `~/.lmp-skills/config.json` under `vaultRoot` (create the file/folder if needed) so future runs, of this skill or any other in the pipeline, read the cache instead of asking again.
   - If a grill session happened earlier in this conversation, use it directly.
   - Otherwise read `{vault root}/tickets/{TASK-ID}/grill.md`.
   - If neither exists, stop and tell the user to run `/grill-jera-task` first.
3. **Load supporting context:**
   - The Jira ticket via Atlassian MCP (`getJiraIssue`) — summary, description, acceptance criteria, comments — unless already read in this conversation.
   - Every other file in `{vault root}/tickets/{TASK-ID}/` (prd.md, implementation-plan.md, etc.), if the folder exists.
   - The relevant parts of the codebase, so requirements reflect how the system actually works today (existing roles/permissions, existing flows, naming). Use the codebase's real domain vocabulary throughout.

## Phase 2: Write the requirement

Write in **Thai**, keeping technical terms (API, export, async, field names, etc.) in English — same register as the example below. The document must be understandable by **QA, Developer, and PM all at once**: no unexplained jargon, no vague hand-waving, every requirement independently testable.

Principles:

- **Be exhaustive.** Every decision made in the grill must appear somewhere in the document. Every answer the user gave is a requirement, a business rule, a scope boundary, or an edge case — place it.
- **One requirement per FR.** Each FR states one verifiable behavior ("ระบบต้อง..."), numbered `FR-01, FR-02, ...`, with a MoSCoW priority (Must / Should / Could).
- **Testable phrasing.** QA should be able to turn each FR into a test case without asking anyone. Include concrete values (limits, formats, timeouts, statuses) whenever the grill or codebase pins them down.
- **Negative space matters.** "ไม่อยู่ในขอบเขต" and edge cases are as important as the happy path — mine the grill Q&A for everything the user explicitly deferred or rejected.

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
# {TASK-ID} | {ชื่อ Task}

> [!summary] สรุป 30 วินาที
> - **ทำอะไร:** {1 ประโยค}
> - **เพื่อใคร:** {actor หลัก}
> - **ทำไมต้องทำ:** {เหตุผลทางธุรกิจสั้น ๆ}
> - **ขนาดงาน:** FR `{n}` ข้อ (🔴 Must `{x}` / 🟡 Should `{y}` / 🟢 Could `{z}`) · Edge case `{m}` เคส
> - **ไม่ทำในงานนี้:** {1-2 ข้อที่คนมักเข้าใจผิดว่าอยู่ในสโคป}

{ย่อหน้าเดียว 2-4 ประโยค ขยายว่าฟีเจอร์นี้คืออะไรและแก้ปัญหาอะไร}

## ขอบเขต (Scope)

| ✅ ทำในงานนี้ | ❌ ไม่ทำ (+ เหตุผล) |
|---|---|
| {สิ่งที่ทำ ข้อละบรรทัด} | {สิ่งที่ตัด — เหตุผล/เลื่อนไปไหน} |

## ผู้ใช้งาน (Actors)

| Actor | ทำอะไรได้ | ไม่เห็น/ทำไม่ได้ |
|---|---|---|
| {role} | {...} | {...} |

## Functional Requirements

| ID | Pri | Requirement | ค่า/ลิมิตที่เกี่ยว |
|---|---|---|---|
| FR-01 | 🔴 Must | ระบบต้อง... | `{ตัวเลข/format/timeout}` |
| FR-02 | 🔴 Must | เมื่อ {เงื่อนไข} ระบบต้อง... | — |
| FR-03 | 🟡 Should | ... | — |

<details>
<summary>FR-0X — {หัวข้อรายละเอียดยาว เช่น สูตรคำนวณ / ตารางสถานะ}</summary>

{รายละเอียดเต็มที่ยาวเกินกว่าจะอยู่ในตาราง}

</details>

## Business Rules

| ID | กฎ | ผลถ้าไม่ทำตาม |
|---|---|---|
| BR-01 | {กฎที่ครอบหลาย FR เช่น การกันกดซ้ำ, ลำดับสถานะ} | {อะไรจะพัง} |

## Non-Functional Requirements

| ด้าน | เป้าหมายที่วัดได้ |
|---|---|
| {Performance / Security / Audit} | {ตัวเลขที่เทสได้} |

{ใส่เฉพาะที่เกี่ยวกับงานนี้จริง ถ้าไม่มีให้ตัด section นี้ทิ้ง}

## เคสที่ต้องพิจารณา (Edge Cases)

| ID | เคส | ผลลัพธ์ที่คาดหวัง | เกี่ยวกับ |
|---|---|---|---|
| EC-01 | {สถานการณ์} | {ต้องเกิดอะไร} | FR-04 |

## คำถามค้าง (Open Questions)

| # | คำถาม | ใครตอบ | บล็อกอะไร |
|---|---|---|---|
| Q1 | {ประเด็นที่ยังไม่มีคำตอบ} | {PM/Dev/ทีมอื่น} | {FR/งานที่เดินต่อไม่ได้} |

{ถ้าไม่มีให้ตัด section นี้ทิ้ง}
```

Section rules:

- Keep the section order fixed. Cut only the sections marked as cuttable (Non-Functional, คำถามค้าง) when empty — never cut TL;DR, Scope, Actors, FRs, or Edge Cases.
- Every edge case must trace back to an FR or Business Rule in the "เกี่ยวกับ" column; if one doesn't, you're probably missing an FR — add it.
- FR ที่ต้องอธิบายยาว (สูตรคำนวณ, ตารางสถานะ, ตัวอย่างข้อมูล) ให้เขียนบรรทัดสั้นในตาราง แล้วใส่ของเต็มใน `<details>` ที่ summary ขึ้นต้นด้วย id เช่น `FR-05 — สูตรคำนวณเต็ม`
- ตัวเลขในกล่อง TL;DR ต้องตรงกับเนื้อในเสมอ — นับใหม่ทุกครั้งที่แก้เอกสาร

### Example (register and level of detail to aim for)

```markdown
# QA-482 | ส่งออกออเดอร์เป็น CSV แบบกลุ่ม

> [!summary] สรุป 30 วินาที
> - **ทำอะไร:** เพิ่มปุ่ม Export CSV บนหน้า Orders list ส่งออกได้ทีละหลายออเดอร์ตามตัวกรองที่เปิดอยู่
> - **เพื่อใคร:** Staff และ Admin
> - **ทำไมต้องทำ:** ทุกวันนี้ต้องก๊อปทีละแถวไปทำรายงานเอง
> - **ขนาดงาน:** FR `7` ข้อ (🔴 Must `6` / 🟡 Should `1`) · Edge case `5` เคส
> - **ไม่ทำในงานนี้:** scheduled export, ไฟล์ `.xlsx`

ฟีเจอร์นี้ให้ผู้ใช้สิทธิ์ staff/admin ส่งออกรายการออเดอร์จากหน้า Orders list เป็น CSV แบบกลุ่ม โดยเคารพตัวกรองที่ active อยู่ ณ ขณะกด และเลือกคอลัมน์เองได้

## ขอบเขต (Scope)

| ✅ ทำในงานนี้ | ❌ ไม่ทำ (+ เหตุผล) |
|---|---|
| ปุ่ม Export CSV บนหน้า Orders list | scheduled export — รอเฟสถัดไป |
| เลือกคอลัมน์ที่จะ export ได้ | ไฟล์ `.xlsx` — ลูกค้าใช้ CSV อยู่แล้ว |
| export ตามตัวกรองที่ active อยู่ | |

## ผู้ใช้งาน (Actors)

| Actor | ทำอะไรได้ | ไม่เห็น/ทำไม่ได้ |
|---|---|---|
| Staff | ใช้ปุ่ม Export ได้เต็มรูปแบบ | — |
| Admin | เท่ากับ Staff | — |
| Viewer | — | มองไม่เห็นปุ่ม Export |

## Functional Requirements

| ID | Pri | Requirement | ค่า/ลิมิตที่เกี่ยว |
|---|---|---|---|
| FR-01 | 🔴 Must | ระบบต้องแสดงปุ่ม "Export CSV" บนหน้า Orders list เฉพาะสิทธิ์ `staff` หรือ `admin` | — |
| FR-02 | 🔴 Must | กดปุ่ม Export ต้องเปิด panel เลือกคอลัมน์ พร้อมชุด default ที่เลือกไว้ล่วงหน้า | — |
| FR-03 | 🔴 Must | ไฟล์ที่ได้ต้องมีเฉพาะออเดอร์ที่ตรงตัวกรองสถานะ/วันที่ ณ ขณะกด export | — |
| FR-04 | 🔴 Must | ถ้าไม่มีออเดอร์ตรงตัวกรอง ต้องแจ้งเตือน ไม่ดาวน์โหลดไฟล์เปล่า | `0 ผลลัพธ์` |
| FR-05 | 🔴 Must | export ต้องทำแบบ asynchronous พร้อม progress indicator ไม่ให้ UI ค้าง | `10,000+ rows` |
| FR-06 | 🔴 Must | ค่าที่มีจุลภาค/อักขระพิเศษต้อง escape ตามมาตรฐาน CSV | `RFC 4180` |
| FR-07 | 🟡 Should | ค่าสกุลเงินต้อง export ด้วยทศนิยม 2 ตำแหน่งเสมอ | `1234.50` |

## Business Rules

| ID | กฎ | ผลถ้าไม่ทำตาม |
|---|---|---|
| BR-01 | ปุ่ม Export ต้อง disable ระหว่างที่มี export ค้างอยู่ในแท็บเดียวกัน | ผู้ใช้กดซ้ำจนยิงงานซ้อน |
| BR-02 | export จากสองแท็บพร้อมกันต้องไม่ทำให้ไฟล์ใดไฟล์หนึ่งเสียหรือค้าง | ได้ไฟล์พังโดยไม่รู้ตัว |

## เคสที่ต้องพิจารณา (Edge Cases)

| ID | เคส | ผลลัพธ์ที่คาดหวัง | เกี่ยวกับ |
|---|---|---|---|
| EC-01 | ตัวกรองไม่ match ออเดอร์เลย | แจ้งเตือน ไม่ดาวน์โหลดไฟล์เปล่า | FR-04 |
| EC-02 | ช่วงวันที่คาบเกี่ยวขอบเขต UTC | จัดออเดอร์เข้าวันที่ถูกต้องตามโซนผู้ใช้ | FR-03 |
| EC-03 | ชื่อ/ที่อยู่ลูกค้ามีจุลภาคหรือ `"` | ค่าถูกครอบด้วย `"` และ escape ถูกต้อง | FR-06 |
| EC-04 | ออเดอร์เกิน `10,000` รายการในครั้งเดียว | มี progress, UI ไม่ค้าง, ไฟล์ครบทุกแถว | FR-05 |
| EC-05 | กด export พร้อมกันจากสองแท็บของ user เดียวกัน | ทั้งสองไฟล์ถูกต้อง ไม่ชนกัน | BR-02 |
```

## Phase 3: Save and report

1. Save the document to `{vault root}/tickets/{TASK-ID}/requirement.md`. Create the folder if it doesn't exist. If `requirement.md` already exists, overwrite it — but tell the user you replaced a previous version.
2. Show the user where the file was saved, plus the TL;DR box verbatim (that box IS the summary — if it doesn't work as one, fix the box, not the chat message) and any open questions that still need answers.
