---
name: to-implementation-plan
description: Read the requirement, testing plan, and current codebase, then produce a plan-mode-style implementation plan — backend APIs with full specs and types, data models, frontend pages and business logic, component and sequence diagrams — and save it to the Obsidian vault ticket folder.
disable-model-invocation: true
---

# To Implementation Plan

This skill works like plan mode: read everything, decide how the feature will actually be built in THIS codebase, and write the plan down — detailed enough that a developer (or agent) can implement from it without re-deriving decisions. Do NOT write the implementation itself; the deliverable is the plan.

## Phase 1: Gather sources

1. **Identify the task ID** (e.g. `LMP-4827`) from the conversation or the skill argument. Ask only if there is truly no trace of it.
2. **Read the ticket folder.** Resolve `{vault root}` first: check `~/.lmp-skills/config.json` for a `vaultRoot` field and use it if present. Otherwise, use `~/Desktop/LMP/lmp-task-prd` if it exists, or ask the user once where their vault is if it doesn't — either way, save the resolved path into `~/.lmp-skills/config.json` under `vaultRoot` (create the file/folder if needed) so future runs, of this skill or any other in the pipeline, read the cache instead of asking again. Read `{vault root}/tickets/{TASK-ID}/`:
   - `requirement.md` — what to build. If missing, stop and tell the user to run `/to-jira-requirement` first.
   - `testing-plan.md` — what the result must survive. Every TC constrains the design (error states, concurrency, limits, permissions). If missing, note it and continue, but tell the user the plan will be weaker without it.
   - `grill.md` and all other files — implementation decisions often live here.
3. **Explore the current codebase deeply** — this is the step that makes the plan real instead of generic (use subagents for breadth):
   - Where do existing APIs live, and what conventions do they follow (routing, controller/service layering, validation, error format, auth middleware)?
   - What do existing data models/migrations look like (ORM, naming, id/timestamp conventions)?
   - How does the frontend structure pages/components/state/API clients?
   - What libs already exist? **Never propose installing a lib that duplicates one already in package.json / go.mod / requirements.**
   - Which existing code can be reused or extended instead of created?
   - **How do the modules involved talk to each other today** (HTTP call, function/service call, event/queue, shared DB table, cron)? You need this to draw the component diagram — don't guess the wiring, read it.

The plan MUST follow the codebase's real conventions — real file paths, real module names, real patterns. A plan that ignores how the repo already does things is wrong even if technically sound.

## Phase 2: Write the plan

Write in **Thai** with technical terms in English. Hard rules:

- **ทุกครั้งที่พูดถึงตัวแปร ต้องบอก type** — params, query, body, response, model field, function argument: no exceptions. Use the codebase's actual type vocabulary (e.g. TypeScript types, Go types) not pseudo-types.
- **ทุก API ต้องมี spec เต็ม**: URL, method, path params, query, request body, response (ทั้ง success และ error), auth/permission ที่ต้องเช็ค
- **ทุก model field ต้องบอกว่ามีไว้ทำอะไร** ไม่ใช่แค่ชื่อกับ type
- Reference real paths in the repo (`src/...`) for every file to create or modify
- Diagrams (component + sequence) use **Mermaid** (renders in Obsidian) — ชื่อ node ต้องเป็นชื่อ module/service/ไฟล์จริงใน repo
- **ต้องมี component diagram เสมอ** แสดงว่าแต่ละ module ติดต่อกันยังไง และของใหม่ไปแปะตรงไหนของระบบเดิม

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
# Implementation Plan — {TASK-ID} | {ชื่อฟีเจอร์}

> [!summary] สรุป 30 วินาที
> - **แนวทาง:** {1 ประโยค เช่น เพิ่ม endpoint ใหม่ใน service เดิม + หน้าใหม่ 1 หน้า}
> - **ขนาดงาน:** API `{n}` · Model/Migration `{m}` · หน้า FE `{p}` · Lib ใหม่ `{k}`
> - **แตะ module:** {ชื่อ module ที่สร้างใหม่/แก้ แบบสั้น}
> - **เริ่มที่:** {step แรกใน work order}
> - **ระวัง:** {ความเสี่ยงอันดับ 1 บรรทัดเดียว}

{ย่อหน้าเดียว 2-4 ประโยค: ทำไมเลือกแนวทางนี้ อิงจาก requirement.md และ testing-plan.md}

## ภาพรวม (Overview)

| หัวข้อ | สรุป |
|---|---|
| แนวทางหลัก | {...} |
| Reuse ของเดิม | {module/component/util ที่มีอยู่แล้วที่จะใช้} |
| การตัดสินใจสำคัญ | {ทางเลือกที่ชั่งแล้วเลือก + เหตุผล 1 บรรทัด} |
| ทางเลือกที่ไม่เอา | {ทางที่ตัดทิ้ง + เหตุผล} |

## Component Diagram

{แผนภาพว่าฟีเจอร์นี้มี module อะไรบ้าง ใครคุยกับใคร ผ่านอะไร — ต้องมีทั้งของเดิมที่เกี่ยวข้องและของใหม่ เพื่อให้เห็นว่าของใหม่ไปต่อกับระบบเดิมตรงไหน}

\```mermaid
graph LR
    subgraph FE["Frontend ({app/package จริง})"]
        Page["{ชื่อหน้า/component}<br/>{path จริง}"]
        ApiClient["{api client module}<br/>{path จริง}"]
    end

    subgraph BE["Backend ({service จริง})"]
        Handler["{controller/handler}<br/>{path จริง}"]
        Service["{service/usecase}<br/>{path จริง}"]
        Repo["{repository/dao}<br/>{path จริง}"]
    end

    subgraph EXT["External"]
        DB[("{ชื่อ database/table หลัก}")]
        Other["{service/3rd party/queue อื่นที่เกี่ยว}"]
    end

    Page -->|"{เรียกฟังก์ชันอะไร}"| ApiClient
    ApiClient -->|"{METHOD /path}"| Handler
    Handler -->|"{ชื่อ method ที่เรียก}"| Service
    Service -->|"{อ่าน/เขียนอะไร}"| Repo
    Repo -->|"{query/table}"| DB
    Service -->|"{protocol + ทำอะไร}"| Other

    classDef new fill:#d3f9d8,stroke:#2b8a3e,stroke-width:2px;
    classDef changed fill:#fff3bf,stroke:#e67700,stroke-width:2px;
    class Page,Handler new;
    class Service changed;
\```

🟩 สร้างใหม่ · 🟨 แก้ของเดิม · ⬜ ของเดิมไม่แตะ

| Module | สถานะ | หน้าที่ | คุยกับใคร ผ่านอะไร |
|---|---|---|---|
| {ชื่อ module + path จริง} | 🟩 ใหม่ / 🟨 แก้ / ⬜ ไม่แตะ | {รับผิดชอบอะไร} | {module ปลายทาง + วิธีติดต่อ เช่น `POST /x`, method call, publish event} |

{กฎ: ทุก node ในไดอะแกรมต้องมีแถวในตาราง และทุกเส้นต้องบอกว่าติดต่อกันด้วยอะไร (HTTP/function call/event/shared table) ไม่ใช่แค่ลากเส้นเปล่า ถ้าระบบมีหลาย service ที่คุยข้ามกัน ให้เห็นครบทุก hop}

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

{ทำ 1 diagram ต่อ flow หลัก — ถ้ามีหลาย flow (happy path, error path, async job) แยก diagram ให้ครบ โดยใส่หัวข้อ `### Flow: {ชื่อ}` กำกับแต่ละอัน}

## Backend

### สรุป API ทั้งหมด

| # | Method + Path | สถานะ | ทำอะไร | ใครเรียกได้ |
|---|---|---|---|---|
| 1 | `POST /api/v1/...` | 🟩 ใหม่ | {1 บรรทัด} | {role} |

### รายละเอียดราย API

#### 1. `{METHOD}` `{/api/v1/...}` — {ชื่อ API} 🟩 ใหม่ | 🟨 แก้

| | |
|---|---|
| **Auth** | {เช็คสิทธิ์ยังไง อิง middleware ตัวไหนใน repo} |
| **ไฟล์** | `{path จริงใน repo}` |
| **Path params** | `id: string (uuid)` — {คำอธิบาย} |
| **Query** | `page: number` (optional, default `1`) — {คำอธิบาย} |

**Request body**

\```typescript
{
  field: string        // มีไว้ทำอะไร
  amount: number       // หน่วยอะไร ข้อจำกัดอะไร
}
\```

**Response `200`**

\```typescript
{ ... }   // ทุก field มี type และคำอธิบาย
\```

**Error**

| Status | เมื่อไหร่ | body |
|---|---|---|
| `400` | {เงื่อนไข} | {shape} |
| `403` | {เงื่อนไข} | {shape} |

<details>
<summary>Logic ภายใน (ทีละ step)</summary>

1. validate {อะไร}
2. query {อะไร}
3. คำนวณ {ยังไง}
4. เขียน {อะไร} — transaction/locking: {ถ้าเกี่ยว}
5. คืน {อะไร}

</details>

### Data Model

#### {ชื่อ model/table} 🟩 สร้างใหม่ | 🟨 เพิ่ม field

| Field | Type | Null | Default | มีไว้ทำอะไร |
|---|---|---|---|---|
| id | uuid | no | gen | primary key |

| | |
|---|---|
| **Index/constraint** | {ที่ต้องเพิ่ม + เหตุผล} |
| **Migration** | {ลำดับ, backward-compatible มั้ย, ต้อง backfill มั้ย} |
| **ไฟล์** | `{path ของ model/migration}` |

### Libraries ที่ต้องติดตั้งเพิ่ม

| Lib | เวอร์ชัน | มีไว้ทำอะไร | ทำไมของเดิมใน repo ไม่พอ |
|---|---|---|---|

{ถ้าไม่ต้องลงอะไรเพิ่ม เขียนว่า "ไม่มี — ใช้ของเดิมทั้งหมด"}

## Frontend

### สรุปหน้า/Component

| # | ชื่อ | สถานะ | Route | เรียก API ไหน |
|---|---|---|---|---|
| 1 | {ชื่อหน้า} | 🟩 ใหม่ | `{/path}` | {API #1} |

### รายละเอียดรายหน้า

#### 1. {ชื่อหน้า} 🟩 ใหม่ | 🟨 แก้

| | |
|---|---|
| **ไฟล์** | `{path จริง}` |
| **Route** | `{url path}` |
| **มีอะไรบ้าง** | {ปุ่ม, ฟอร์ม, ตาราง, modal, state ว่าง/โหลด/error} |
| **เรียก API ตอนไหน** | {mount / กดปุ่ม / polling} |

**State/props สำคัญ**

| ชื่อ | Type | มีไว้ทำอะไร |
|---|---|---|
| {name} | `{type}` | {...} |

<details>
<summary>Business logic ฝั่ง client</summary>

- **เงื่อนไขการแสดงผล:** {...}
- **Validation:** {...}
- **กันกดซ้ำ:** {...}
- **Handle error แต่ละแบบ:** {...}

</details>

### Libraries ที่ต้องติดตั้งเพิ่ม

{ตารางเดียวกับฝั่ง backend — ถ้าไม่มีเขียนว่าไม่มี}

## ลำดับการพัฒนา (Work Order)

| Step | ทำอะไร | ไฟล์หลัก | ทำขนานกับ step อื่นได้มั้ย | จบแล้วเทสยังไง |
|---|---|---|---|---|
| 1 | {มักเป็น migration/model} | `{path}` | ไม่ได้ — ทุกอย่างรอ | {...} |
| 2 | {API} | `{path}` | ขนานกับ step 3 ได้ | {...} |
| 3 | {frontend} | `{path}` | | {...} |
| 4 | เก็บงาน: เชื่อม TC จาก testing plan | — | | {...} |

## ความเสี่ยงและจุดที่ต้องระวัง

| ความเสี่ยง | โอกาสพัง | กันยังไง |
|---|---|---|
| {จุดที่พังง่าย อิง edge case/ฟีเจอร์เดิมที่ share code/performance} | สูง/กลาง/ต่ำ | {...} |

## Mapping กับ Testing Plan

| TC | ส่วนของ plan ที่รองรับ |
|---|---|
| TC-01 | API #1 + หน้า #1 |

{ทุก TC ใน testing-plan.md ต้องชี้ได้ว่าส่วนไหนของ plan ทำให้มันผ่าน — TC ไหนชี้ไม่ได้แปลว่า plan ยังขาด ให้กลับไปเติม}
```

Section rules:

- The Component Diagram is never cut — even a backend-only change has modules talking to each other. If the change lives entirely inside one module, draw that module plus everything it calls and everything that calls it.
- Cut the Data Model or Frontend section only when the task genuinely doesn't touch that side — say so explicitly ("งานนี้ไม่มีการแก้ backend") rather than deleting silently.
- If the grill/requirement left an implementation choice open, make the call yourself based on the codebase, state it in "การตัดสินใจสำคัญ" with the reason, and flag it as a decision the user can veto.
- Do not paste large code blocks — type shapes, schemas, and pseudo-step logic only. The plan describes; the implementation session writes code.
- สรุปตารางต้องมาก่อนรายละเอียดเสมอ (สรุป API → รายละเอียดราย API) คนที่อยากรู้แค่ "มีอะไรบ้าง" ต้องจบที่ตารางเดียว
- ตัวเลขในกล่อง TL;DR ต้องตรงกับจำนวนจริงในเอกสาร — นับใหม่ทุกครั้งที่แก้

## Phase 3: Save and report

1. Save to `{vault root}/tickets/{TASK-ID}/implementation-plan.md`. If the file already exists, overwrite it but tell the user you replaced a previous version.
2. Report to the user: the TL;DR box verbatim, the chosen approach in 2-3 sentences, how many APIs / models / pages the plan adds or changes, which modules the component diagram shows as new or modified, any new libs, the key decisions you made on their behalf (for veto), and any TC from the testing plan that the plan can't satisfy yet.
