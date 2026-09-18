# LMP Skills

Skill สำหรับ workflow Jira/QA ของทีม 6 ตัว อยู่ที่ `skills/<name>/SKILL.md` แต่ละ
ไฟล์ resolve path เฉพาะเครื่อง (root ของ vault, workspace Playwright ส่วนตัว)
เองตอนรัน ไม่ต้องมีขั้นตอน build ตอนติดตั้ง:

1. เช็ค `~/.lmp-skills/config.json` ก่อน — ถ้ามี path อยู่แล้วใช้เลย จบ
2. ถ้าไม่มี เช็ค path default (เช่น `~/Desktop/LMP/lmp-task-prd`) ถ้ามีอยู่จริงก็ใช้อันนี้
3. ถ้าไม่มีทั้งคู่ ถามผู้ใช้ในแชทครั้งเดียว

ไม่ว่าจะ resolve ได้จากทางไหน path นั้นจะถูกเซฟลง `~/.lmp-skills/config.json`
ทันที ทำให้การรัน skill ครั้งต่อๆ ไป — ไม่ว่า skill ไหนในชุดนี้ — อ่านจาก cache
แทนที่จะถามซ้ำ พูดง่ายๆ คือเพื่อนร่วมทีมที่ vault อยู่คนละที่จะถูกถามแค่ครั้งเดียว
ตอนรัน skill ตัวแรกสุด

## ติดตั้ง

ไม่ต้อง clone — ใช้ [vercel-labs/skills](https://github.com/vercel-labs/skills)
ดึงและติดตั้งจาก repo ตรงๆ (ต้องมี Node ≥20):

```bash
npx skills@latest add aaapwn/lmp-jira-skills
```

เครื่องมือนี้จะเช็คว่าเครื่องมี coding agent ตัวไหนบ้าง (Claude Code, Cursor, ...)
ให้เลือกว่าจะติดตั้ง skill ไหนใน 6 ตัว (มี description ให้ดูประกอบ) แล้วติดตั้งให้
— default เป็นแบบ project-scoped หรือใส่ `-g` เพื่อติดตั้งแบบ global ก็ได้ ดู flag
เพิ่มเติมได้จาก `npx skills@latest add --help` (เช่น `--all`, `--agent`, `--copy`
แทน symlink)

## Pipeline และวิธีใช้แต่ละ skill

ลำดับการใช้งานทั่วไปของ 1 Jira task:

```
/grill-jera-task → /to-jira-requirement → /to-testing-plan → /to-implementation-plan
        → (dev เขียนโค้ดจริง) → /jira-testing → (ถ้า requirement เปลี่ยน) /change-requirement
```

### `/grill-jera-task` — จุดเริ่มต้น

ให้ Jira task (ตัวอย่าง `LMP-4827` หรือ URL) ตอนเรียก skill หรือพิมพ์ในแชทก็ได้
skill จะ:

- อ่าน Jira ticket ผ่าน Atlassian MCP
- เช็คว่ามีงานเก่าใน vault ของ task นี้อยู่แล้วหรือไม่
- สำรวจ codebase ที่เกี่ยวข้อง
- แล้ว "กริล" (สัมภาษณ์) ผู้ใช้เป็นรอบ ๆ แบบ design tree — แต่ละรอบถามทุกคำถามที่พร้อมถาม
  (frontier) พร้อมคำแนะนำในแต่ละข้อ คำตอบของรอบนั้นจะปลดล็อกคำถามรอบถัดไป จนไม่เหลือ
  branch ที่ยังไม่ได้เคลียร์

จบแล้วเซฟ transcript คำถาม-คำตอบทั้งหมดไปที่ `{vault}/tickets/{TASK-ID}/grill.md`

### `/to-jira-requirement` — สร้าง requirement

รันต่อจาก grill session (ใช้ข้อมูลจาก session เดิมถ้าอยู่ในแชทเดียวกัน หรืออ่านจาก
`grill.md` ก็ได้) แปลงเป็นเอกสาร requirement ที่ละเอียดที่สุด อ่านแล้ว QA/Dev/PM
เข้าใจตรงกัน **ไม่มีการถามเพิ่ม** เป็นการ synthesize ล้วนๆ เซฟไปที่
`{vault}/tickets/{TASK-ID}/requirement.md`

### `/to-testing-plan` — สร้าง testing plan

อ่าน `requirement.md` และ context อื่นในตั๋ว บวกสำรวจ codebase เพื่อหา
regression case สร้าง testing plan ที่ครอบคลุมที่สุด (e2e, functional case,
edge case, regression, permission) เน้นความครบ ไม่เน้นสั้น เซฟไปที่
`{vault}/tickets/{TASK-ID}/testing-plan.md`

### `/to-implementation-plan` — สร้างแผน implementation

ทำงานคล้าย plan mode: อ่าน requirement + testing plan + สำรวจ codebase จริง
แล้วเขียนแผนละเอียดระดับที่ dev (หรือ agent) หยิบไปทำต่อได้เลยโดยไม่ต้องมานั่ง
ตัดสินใจเอง (API spec เต็ม, data model, component diagram, sequence diagram) **ไม่ได้เขียนโค้ดจริง**
เซฟไปที่ `{vault}/tickets/{TASK-ID}/implementation-plan.md`

### `/jira-testing` — รันเทสจริง

รัน `testing-plan.md` กับแอปที่รันอยู่จริง ด้วยกลยุทธ์ 3 tier: Playwright API test

- Playwright E2E (ใน workspace ส่วนตัว ไม่แตะ repo งาน) และ Claude in Chrome
  สำหรับเคสที่ต้องใช้สายตา เจอบั๊กแล้ว**บันทึกเฉยๆ ไม่แก้ให้** บันทึกผลไปที่
  `{vault}/tickets/{TASK-ID}/test-results/round-NN-{date}.md`

### `/change-requirement` — เมื่อ requirement เปลี่ยนกลางทาง

บอก skill ว่าอะไรเปลี่ยน แล้ว skill จะอ่านทุกไฟล์ในตั๋ว + โค้ดที่ทำไปแล้ว หา
blast radius ก่อน แล้วกริลเฉพาะส่วนที่เปลี่ยน จบแล้วอัปเดต requirement /
testing-plan / implementation-plan ทุกไฟล์ที่กระทบ พร้อม change log ในตัว
ไม่ renumber FR/TC เดิม

## เอกสารที่ได้หน้าตาเป็นยังไง

ทุก skill เขียนเอกสารแบบ **สแกนได้ก่อน อ่านละเอียดทีหลัง** เพราะของยาว ๆ ไม่มีใคร
อ่าน:

- **กล่อง TL;DR "สรุป 30 วินาที"** อยู่บนสุดของทุกไฟล์ — เรื่องอะไร ใหญ่แค่ไหน
  (เป็นตัวเลข) ต้องทำอะไรต่อ ใช้ callout ของ Obsidian (`> [!summary]`) ถ้าเปิดด้วย
  editor อื่นจะเห็นเป็น blockquote ธรรมดา อ่านออกเหมือนกัน
- **ตารางแทนย่อหน้า** ทุกที่ที่ข้อมูลขนานกัน — FR, edge case, test case, บัค,
  ไฟล์ที่แตะ ล้วนเป็นตารางที่มี id กำกับ
- **ตารางสรุปมาก่อนรายละเอียดเสมอ** เช่น implementation plan มีตาราง "สรุป API
  ทั้งหมด" ก่อนสเปคเต็มราย API, test results มีตาราง "เคสที่ไม่ผ่าน" ก่อนผลรายเคส
  ทั้งหมด
- **ของยาวที่ไม่ได้อ่านทุกครั้งถูกพับใน `<details>`** เช่น logic ภายในราย API,
  ขั้นตอน reproduce ของบัค, ผลเทสเคสที่ผ่านหมดแล้ว
- **emoji เป็น marker สถานะ** `🔴 Must` / `✅ ผ่าน` / `🟩 ใหม่` ไม่ได้ใส่ประดับ

สำคัญ: อ่านง่ายขึ้น **ไม่ได้แปลว่าเนื้อหาน้อยลง** — skill ยังถูกสั่งให้เขียนให้ครบ
เหมือนเดิม (ห้ามตัด FR/TC ทิ้งเพื่อความสั้น) สิ่งที่เปลี่ยนคือการจัดวาง ไม่ใช่ปริมาณ

## ถ้าไม่อยากใช้ Obsidian

"vault" ในที่นี้คือแค่โฟลเดอร์เก็บไฟล์ `.md` ธรรมดา ไม่ได้ผูกกับแอป Obsidian
จริงๆ — skill ทุกตัวแค่ Read/Write ไฟล์ markdown ตรงๆ ไม่ได้เรียกใช้ฟีเจอร์อะไร
ของ Obsidian เลย

ถ้าไม่อยากติดตั้ง Obsidian ก็ทำได้เลย แค่ตอนที่ skill ถาม (ครั้งแรกที่รัน skill
ไหนก็ตาม) ให้ตอบเป็น path โฟลเดอร์ธรรมดาที่ไหนก็ได้ เช่น
`~/lmp-tickets` หรือโฟลเดอร์ในโปรเจกต์ตัวเอง — skill จะสร้างโฟลเดอร์ให้เองถ้ายัง
ไม่มี แล้วเปิดอ่าน/แก้ไฟล์ `.md` พวกนั้นด้วย text editor ธรรมดา (VS Code, `cat`,
หรืออะไรก็ได้ที่เปิดไฟล์ markdown ได้) แทนการเปิดผ่าน Obsidian

ถ้าอยากเปลี่ยน path ที่ตั้งไว้แล้ว แก้ค่า `vaultRoot` (และ/หรือ
`playwrightWorkspace` สำหรับ `/jira-testing`) ใน `~/.lmp-skills/config.json`
ได้ตรงๆ โดยไม่ต้องรอให้ skill ถามใหม่

## แก้ไข skill

แก้ที่ `skills/<name>/SKILL.md` ตรงๆ ได้เลย ไม่มีขั้นตอน build/render ใดๆ
แต่ละไฟล์มี logic การ resolve path เขียนไว้ใน phase แรกที่ต้องใช้ path นั้น
(หา `.lmp-skills/config.json` ในไฟล์เจอ) ถ้าจะเพิ่ม path เฉพาะเครื่องตัวใหม่
ให้ตามแพทเทิร์นเดียวกัน อย่า hard-code path ของคนใดคนหนึ่ง
