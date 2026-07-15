---
name: to-jira-requirement
description: Turn grill session data into the most detailed requirement document possible — readable by QA, Developer, and PM alike — and save it to the Obsidian vault ticket folder. No interview, just synthesis of the grill Q&A, the Jira ticket, and the codebase.
disable-model-invocation: true
---

# To Jira Requirement

This skill takes grill session data (from `/grill-jera-task`) and produces the most detailed requirement document you can write. Do NOT interview the user — just synthesize what you already know. If something is genuinely unknowable from the sources below, record it in the "คำถามค้าง" section instead of asking.

## Phase 1: Gather sources

1. **Identify the task ID** (e.g. `LMP-4827`). Take it from the current conversation, the skill argument, or ask the user for it if there is truly no trace of it — that's the only question allowed.
2. **Load the grill data** — the primary source:
   - If a grill session happened earlier in this conversation, use it directly.
   - Otherwise read `{{VAULT_ROOT}}/tickets/{TASK-ID}/grill.md`.
   - If neither exists, stop and tell the user to run `/grill-jera-task` first.
3. **Load supporting context:**
   - The Jira ticket via Atlassian MCP (`getJiraIssue`) — summary, description, acceptance criteria, comments — unless already read in this conversation.
   - Every other file in `{{VAULT_ROOT}}/tickets/{TASK-ID}/` (prd.md, implementation-plan.md, etc.), if the folder exists.
   - The relevant parts of the codebase, so requirements reflect how the system actually works today (existing roles/permissions, existing flows, naming). Use the codebase's real domain vocabulary throughout.

## Phase 2: Write the requirement

Write in **Thai**, keeping technical terms (API, export, async, field names, etc.) in English — same register as the example below. The document must be understandable by **QA, Developer, and PM all at once**: no unexplained jargon, no vague hand-waving, every requirement independently testable.

Principles:

- **Be exhaustive.** Every decision made in the grill must appear somewhere in the document. Every answer the user gave is a requirement, a business rule, a scope boundary, or an edge case — place it.
- **One requirement per FR.** Each FR states one verifiable behavior ("ระบบต้อง..."), numbered `FR-01, FR-02, ...`, with a MoSCoW priority (Must / Should / Could).
- **Testable phrasing.** QA should be able to turn each FR into a test case without asking anyone. Include concrete values (limits, formats, timeouts, statuses) whenever the grill or codebase pins them down.
- **Negative space matters.** "ไม่อยู่ในขอบเขต" and edge cases are as important as the happy path — mine the grill Q&A for everything the user explicitly deferred or rejected.

### Template

```markdown
# {TASK-ID} | {ชื่อ Task}

{description คร่าว ๆ — 2-4 ประโยค บอกว่าฟีเจอร์นี้คืออะไร ทำเพื่อใคร และทำไมถึงทำ}

## ขอบเขต (Scope)

### อยู่ในขอบเขต
- {สิ่งที่ทำในงานนี้ ทีละข้อ}

### ไม่อยู่ในขอบเขต
- {สิ่งที่ตัดออก/เลื่อนไปทำทีหลัง พร้อมเหตุผลสั้น ๆ ถ้ามีจากการ grill}

## ผู้ใช้งาน (Actors)

| Actor | สิทธิ์/สิ่งที่ทำได้ |
|---|---|
| {role} | {ทำอะไรได้บ้าง เห็นอะไรบ้าง} |

## Functional Requirements

| ID | Priority | Requirement |
|---|---|---|
| FR-01 | Must | ระบบต้อง... |
| FR-02 | Must | เมื่อ {เงื่อนไข} ระบบต้อง... |
| FR-03 | Should | ... |

## Business Rules

- {กฎทางธุรกิจ/ข้อบังคับที่ครอบหลาย FR เช่น การกันกดซ้ำ, ลำดับสถานะ, สูตรคำนวณ}

## Non-Functional Requirements

- {performance, security, ปริมาณข้อมูล, timeout, audit log — ใส่เฉพาะที่เกี่ยวกับงานนี้จริง ถ้าไม่มีให้ตัด section นี้ทิ้ง}

## เคสที่ต้องพิจารณา (Edge Cases)

- {edge case ที่ dev ต้องระวังและ QA ต้องเทสต์ ทีละข้อ — ผลลัพธ์ที่คาดหวังของแต่ละเคสต้องชัด}

## คำถามค้าง (Open Questions)

- {ประเด็นที่ยังไม่มีคำตอบจากการ grill — ถ้าไม่มีให้ตัด section นี้ทิ้ง}
```

Section rules:

- Keep the section order fixed. Cut only the sections marked as cuttable (Non-Functional, คำถามค้าง) when empty — never cut Scope, Actors, FRs, or Edge Cases.
- Every edge case should trace back to an FR or Business Rule; if one doesn't, you're probably missing an FR — add it.

### Example (register and level of detail to aim for)

```markdown
# QA-482 | ส่งออกออเดอร์เป็น CSV แบบกลุ่ม

ฟีเจอร์นี้เพิ่มความสามารถให้ผู้ใช้สิทธิ์ staff และ admin ส่งออกรายการออเดอร์จากหน้า Orders list เป็นไฟล์ CSV แบบกลุ่ม โดยเคารพตัวกรองที่ใช้งานอยู่ ณ ขณะนั้น และรองรับการเลือกคอลัมน์เอง

## ขอบเขต (Scope)

### อยู่ในขอบเขต
- ปุ่ม Export CSV บนหน้า Orders list
- การเลือกคอลัมน์สำหรับ export
- การ export ตามตัวกรองที่ active อยู่

### ไม่อยู่ในขอบเขต
- การตั้งเวลา export อัตโนมัติ (scheduled export)
- การ export เป็นไฟล์ Excel (.xlsx)

## ผู้ใช้งาน (Actors)

| Actor | สิทธิ์/สิ่งที่ทำได้ |
|---|---|
| Staff | เห็นและใช้งานปุ่ม Export ได้เต็มรูปแบบ |
| Admin | สิทธิ์เท่ากับ Staff |
| Viewer | มองไม่เห็นปุ่ม Export |

## Functional Requirements

| ID | Priority | Requirement |
|---|---|---|
| FR-01 | Must | ระบบต้องแสดงปุ่ม "Export CSV" บนหน้า Orders list เฉพาะผู้ใช้ที่มีสิทธิ์ staff หรือ admin |
| FR-02 | Must | เมื่อกดปุ่ม Export ต้องเปิด panel ให้เลือกคอลัมน์ที่ต้องการ export โดยมีชุดคอลัมน์ default ที่เลือกไว้ล่วงหน้า |
| FR-03 | Must | ไฟล์ที่ export ต้องมีเฉพาะออเดอร์ที่ตรงกับตัวกรองสถานะ/วันที่ที่ active อยู่บนหน้าจอ ณ ขณะกด export |
| FR-04 | Must | หากไม่มีออเดอร์ที่ตรงตัวกรอง ระบบต้องแสดงข้อความแจ้งเตือนแทนการดาวน์โหลดไฟล์เปล่า |
| FR-05 | Must | ระบบต้องประมวลผลการ export แบบ asynchronous พร้อม progress indicator เพื่อไม่ให้ UI ค้างเมื่อข้อมูลมีจำนวนมาก (10,000+ รายการ) |
| FR-06 | Must | ค่าฟิลด์ที่มีจุลภาคหรืออักขระพิเศษต้องถูก escape ตามมาตรฐาน CSV (RFC 4180) |
| FR-07 | Should | ค่าสกุลเงินใน CSV ต้อง export ด้วยทศนิยม 2 ตำแหน่งเสมอ |

## Business Rules

- ปุ่ม Export ต้องถูก disable ระหว่างที่มีการ export ค้างอยู่ในแท็บเดียวกัน เพื่อป้องกันการกดซ้ำ
- การ export จากสองแท็บพร้อมกันต้องไม่ทำให้ไฟล์ใดไฟล์หนึ่งเสียหายหรือค้าง

## เคสที่ต้องพิจารณา (Edge Cases)

- ตัวกรองไม่ match ออเดอร์เลย (0 ผลลัพธ์) — ต้องแจ้งเตือน ไม่ดาวน์โหลดไฟล์เปล่า
- ช่วงวันที่ที่เลือกคาบเกี่ยวขอบเขตไทม์โซน (UTC boundary)
- ชื่อ/ที่อยู่ลูกค้ามีจุลภาคหรือเครื่องหมายคำพูด
- จำนวนออเดอร์เกิน 10,000 รายการในการ export ครั้งเดียว
- การกด export พร้อมกันจากสองแท็บของผู้ใช้คนเดียวกัน
```

## Phase 3: Save and report

1. Save the document to `{{VAULT_ROOT}}/tickets/{TASK-ID}/requirement.md`. Create the folder if it doesn't exist. If `requirement.md` already exists, overwrite it — but tell the user you replaced a previous version.
2. Show the user where the file was saved, plus a short summary: how many FRs, what the notable scope cuts are, and any open questions that still need answers.
