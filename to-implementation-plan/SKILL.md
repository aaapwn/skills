---
name: to-implementation-plan
description: Read the requirement, testing plan, and current codebase, then produce a plan-mode-style implementation plan — backend APIs with full specs and types, data models, frontend pages and business logic, sequence diagrams — and save it to the Obsidian vault ticket folder.
disable-model-invocation: true
---

# To Implementation Plan

This skill works like plan mode: read everything, decide how the feature will actually be built in THIS codebase, and write the plan down — detailed enough that a developer (or agent) can implement from it without re-deriving decisions. Do NOT write the implementation itself; the deliverable is the plan.

## Phase 1: Gather sources

1. **Identify the task ID** (e.g. `LMP-4827`) from the conversation or the skill argument. Ask only if there is truly no trace of it.
2. **Read the ticket folder** `{{VAULT_ROOT}}/tickets/{TASK-ID}/`:
   - `requirement.md` — what to build. If missing, stop and tell the user to run `/to-jira-requirement` first.
   - `testing-plan.md` — what the result must survive. Every TC constrains the design (error states, concurrency, limits, permissions). If missing, note it and continue, but tell the user the plan will be weaker without it.
   - `grill.md` and all other files — implementation decisions often live here.
3. **Explore the current codebase deeply** — this is the step that makes the plan real instead of generic (use subagents for breadth):
   - Where do existing APIs live, and what conventions do they follow (routing, controller/service layering, validation, error format, auth middleware)?
   - What do existing data models/migrations look like (ORM, naming, id/timestamp conventions)?
   - How does the frontend structure pages/components/state/API clients?
   - What libs already exist? **Never propose installing a lib that duplicates one already in package.json / go.mod / requirements.**
   - Which existing code can be reused or extended instead of created?

The plan MUST follow the codebase's real conventions — real file paths, real module names, real patterns. A plan that ignores how the repo already does things is wrong even if technically sound.

## Phase 2: Write the plan

Write in **Thai** with technical terms in English. Hard rules:

- **ทุกครั้งที่พูดถึงตัวแปร ต้องบอก type** — params, query, body, response, model field, function argument: no exceptions. Use the codebase's actual type vocabulary (e.g. TypeScript types, Go types) not pseudo-types.
- **ทุก API ต้องมี spec เต็ม**: URL, method, path params, query, request body, response (ทั้ง success และ error), auth/permission ที่ต้องเช็ค
- **ทุก model field ต้องบอกว่ามีไว้ทำอะไร** ไม่ใช่แค่ชื่อกับ type
- Reference real paths in the repo (`src/...`) for every file to create or modify
- Sequence diagrams use **Mermaid** (renders in Obsidian)

### Template

```markdown
# Implementation Plan — {TASK-ID} | {ชื่อฟีเจอร์}

{ย่อหน้าสรุป: แนวทางโดยรวม สถาปัตยกรรมที่เลือก และเหตุผลสั้น ๆ อิงจาก requirement.md และ testing-plan.md}

## ภาพรวม (Overview)

- แนวทางหลัก: {เช่น เพิ่ม endpoint ใหม่ใน service เดิม + หน้าใหม่ 1 หน้า}
- สิ่งที่ reuse จากของเดิม: {module/component/util ที่มีอยู่แล้วที่จะใช้}
- การตัดสินใจสำคัญ: {ทางเลือกที่ชั่งแล้วเลือก พร้อมเหตุผล 1 บรรทัด}

## Sequence Diagram

\```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend ({ชื่อหน้า})
    participant API as Backend ({service})
    participant DB as Database
    User->>FE: {action}
    FE->>API: {METHOD /path}
    API->>DB: {query/write}
    DB-->>API: {result}
    API-->>FE: {response}
    FE-->>User: {สิ่งที่เห็น}
\```

{ทำ 1 diagram ต่อ flow หลัก — ถ้ามีหลาย flow (happy path, error path, async job) แยก diagram ให้ครบ}

## Backend

### API ที่ต้องสร้าง/แก้ไข

#### 1. {ชื่อ API — สร้างใหม่ | แก้ไข}

- **URL:** `{/api/v1/...}`
- **Method:** `{GET|POST|PUT|PATCH|DELETE}`
- **Auth:** {ใครเรียกได้ เช็คสิทธิ์ยังไง อิง middleware ตัวไหนใน repo}
- **Path params:**
  | ชื่อ | Type | คำอธิบาย |
  |---|---|---|
  | id | string (uuid) | ... |
- **Query:**
  | ชื่อ | Type | Required | Default | คำอธิบาย |
  |---|---|---|---|---|
- **Request body:**
  \```typescript
  {
    field: string        // มีไว้ทำอะไร
    amount: number       // หน่วยอะไร ข้อจำกัดอะไร
  }
  \```
- **Response (200):**
  \```typescript
  { ... }   // ทุก field มี type และคำอธิบาย
  \```
- **Error responses:** {status code + body + เงื่อนไขที่ทำให้เกิด ทีละตัว}
- **Logic:** {ขั้นตอนการทำงานภายใน ทีละ step: validate อะไร → query อะไร → คำนวณยังไง → เขียนอะไร → คืนอะไร รวม transaction/locking ถ้าเกี่ยว}
- **ไฟล์:** {path จริงใน repo ที่จะสร้าง/แก้ ตาม convention ของ codebase}

### Data Model

#### {ชื่อ model/table — สร้างใหม่ | เพิ่ม field}

| Field | Type | Nullable | Default | มีไว้ทำอะไร |
|---|---|---|---|---|
| id | uuid | no | gen | primary key |
| ... | ... | ... | ... | ... |

- **Index/constraint:** {ที่ต้องเพิ่ม พร้อมเหตุผล}
- **Migration:** {ลำดับการ migrate, backward-compatible มั้ย, ข้อมูลเดิมต้อง backfill มั้ย}
- **ไฟล์:** {path ของ model/migration}

### Libraries ที่ต้องติดตั้งเพิ่ม

| Lib | เวอร์ชัน | มีไว้ทำอะไร | ทำไมของเดิมใน repo ไม่พอ |
|---|---|---|---|

{ถ้าไม่ต้องลงอะไรเพิ่ม เขียนว่า "ไม่มี — ใช้ของเดิมทั้งหมด"}

## Frontend

### หน้า/Component ที่ต้องสร้างหรือแก้ไข

#### 1. {ชื่อหน้า — สร้างใหม่ | แก้ไข}

- **ไฟล์:** {path จริง ตามโครงสร้าง repo}
- **Route:** {url path ฝั่ง frontend ถ้ามี}
- **มีอะไรบ้าง:** {องค์ประกอบบนหน้า: ปุ่ม, ฟอร์ม, ตาราง, modal, state ว่าง/โหลด/error}
- **API ที่เรียก:** {endpoint ไหน เรียกตอนไหน (mount, กดปุ่ม, polling)}
- **Business logic:** {เงื่อนไขการแสดงผล, validation ฝั่ง client, การจัดการ state, การกันกดซ้ำ, การ handle error แต่ละแบบ}
- **State/props สำคัญ:** {ชื่อ + type + มีไว้ทำอะไร}

### Libraries ที่ต้องติดตั้งเพิ่ม

{ตารางเดียวกับฝั่ง backend — ถ้าไม่มีเขียนว่าไม่มี}

## ลำดับการพัฒนา (Work Order)

1. {step แรก — มักเป็น migration/model}
2. {step ถัดไป — API}
3. {frontend}
4. {เก็บงาน: เชื่อม TC จาก testing plan}

{แต่ละ step ควรจบแบบเทสได้ ถ้างานใหญ่พอจะแบ่งคนทำ ให้บอกว่า step ไหน parallel กันได้}

## ความเสี่ยงและจุดที่ต้องระวัง

- {จุดที่พังง่าย อิงจาก edge case ใน testing plan, ผลกระทบต่อฟีเจอร์เดิมที่ share code, performance}

## Mapping กับ Testing Plan

| TC | ส่วนของ plan ที่รองรับ |
|---|---|
| TC-01 | API #1 + หน้า #1 |
| ... | ... |

{ทุก TC ใน testing-plan.md ต้องชี้ได้ว่าส่วนไหนของ plan ทำให้มันผ่าน — TC ไหนชี้ไม่ได้แปลว่า plan ยังขาด ให้กลับไปเติม}
```

Section rules:

- Cut the Data Model or Frontend section only when the task genuinely doesn't touch that side — say so explicitly ("งานนี้ไม่มีการแก้ backend") rather than deleting silently.
- If the grill/requirement left an implementation choice open, make the call yourself based on the codebase, state it in "การตัดสินใจสำคัญ" with the reason, and flag it as a decision the user can veto.
- Do not paste large code blocks — type shapes, schemas, and pseudo-step logic only. The plan describes; the implementation session writes code.

## Phase 3: Save and report

1. Save to `{{VAULT_ROOT}}/tickets/{TASK-ID}/implementation-plan.md`. If the file already exists, overwrite it but tell the user you replaced a previous version.
2. Report to the user: the chosen approach in 2-3 sentences, how many APIs / models / pages the plan adds or changes, any new libs, the key decisions you made on their behalf (for veto), and any TC from the testing plan that the plan can't satisfy yet.
