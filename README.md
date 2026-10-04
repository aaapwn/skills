# Skills

Plugin และ skill ส่วนตัวสำหรับ Claude Code repo นี้เป็น plugin marketplace ด้วย
(`aaapwn-skills`)

## Plugins

| Plugin | ใช้เมื่อ |
| --- | --- |
| [`crewsade`](plugins/claude/crewsade) | ทำงานเป็นทีม — `/crewsade:foreman` เปลี่ยน session หลักเป็นหัวหน้างาน แจกงานอ่าน เขียน และตรวจให้ agent 4 ตัว (แนะนำให้ติดตั้ง `karpathy-guidelines` และ `scrutinize` ด้วย ถ้าไม่มี agent จะใช้กฎสำรองในตัว) |

รายละเอียดการใช้งานอยู่ที่ [plugins/README.md](plugins/README.md)

ติดตั้งจาก GitHub:

```bash
claude plugin marketplace add aaapwn/skills
```

```bash
claude plugin install crewsade@aaapwn-skills
```

ระหว่างพัฒนา ให้โหลดจาก disk ตรงๆ แทน (แก้ไฟล์แล้วใช้ `/reload-plugins` ได้เลย):

```bash
claude --plugin-dir ./plugins/claude/crewsade
```

เช็คทุกครั้งหลังแก้:

```bash
claude plugin validate . && claude plugin validate ./plugins/claude/crewsade
```

---

## Skills

Skill เดี่ยวที่ไม่ได้อยู่ใน plugin อยู่ที่ `skills/<name>/SKILL.md`

| Skill | ใช้เมื่อ |
| --- | --- |
| [`gojira`](skills/gojira/SKILL.md) | เขียน Jira task ที่มีเป้าหมาย ขอบเขต และเกณฑ์ตรวจรับ ให้ dev หยิบไปทำได้และคนตรวจเช็คได้ทีละข้อ |
| [`bulletin`](skills/bulletin/SKILL.md) | สรุปงานที่ทำเสร็จแล้วสั้นๆ สำหรับ PR/MR description, รายงาน PM หรือ comment ใน Jira |

สองตัวนี้ใช้คู่กันได้ตั้งแต่ต้นจนจบ task: `gojira` ตอนเปิดงาน → ทำงาน (เองหรือผ่าน
`crewsade`) → `bulletin` ตอนส่งงาน

ติดตั้งด้วย [vercel-labs/skills](https://github.com/vercel-labs/skills) (ต้องมี Node ≥20)
เครื่องมือจะให้เลือกว่าจะติดตั้ง skill ไหน:

```bash
npx skills@latest add aaapwn/skills
```

### `gojira` — เขียน Jira task

เรียกได้ทั้งพิมพ์ `/gojira` หรือพูดว่า "สร้าง task", "เขียน ticket", "เขียน requirement"

ticket ที่ได้เขียนให้คนอ่าน 2 กลุ่มพร้อมกัน: **dev** ที่ต้องรู้ว่าจะสร้างอะไรและขอบอยู่ตรงไหน
กับ **คนตรวจ** ที่ต้องตัดสินว่า "เสร็จหรือยัง" ได้ทีละข้อโดยไม่ต้องถามใคร

- **Summary** รูปแบบ `[<ฟีเจอร์>] <กริยา> <สิ่งที่ส่งมอบ>` ไม่เกินราว 80 ตัวอักษร
- **Description** มี 3 ส่วน:
  - `เป้าหมาย` — งานนี้ทำให้เกิดอะไร และเพื่ออะไร (บอกสภาพตอนจบ ไม่ใช่ขั้นตอน)
  - `ขอบเขตและเกณฑ์ตรวจรับ` — แบ่งเป็นหมวดมีเลขกำกับ (อ้างถึงได้แบบ "2.3")
    และปิดท้ายด้วยหมวดการทดสอบเสมอ
  - `หมายเหตุ` — ของเดิมที่ให้ใช้ต่อ, สิ่งที่อยู่นอกขอบเขตโดยตั้งใจ, ข้อจำกัดที่ยอมรับ
- **เกณฑ์ตรวจรับแต่ละข้อต้องตอบได้ว่าใช่หรือไม่ใช่** — บอกสภาพที่มองเห็นได้ ไม่ใช่ขั้นตอน,
  ระบุชื่อ field / endpoint / error code ที่จะถูกตรวจ, ห้ามใช้คำกว้างๆ อย่าง "เร็ว" หรือ
  "ปลอดภัย" โดยไม่มีตัวเลขหรือกฎกำกับ, บอกว่าถ้าถูกปฏิเสธผู้เรียกจะได้อะไรกลับ, หนึ่งข้อหนึ่งเรื่อง

ขั้นตอน: อ่านของที่มีอยู่ (Confluence, ticket เดิม, โค้ด — อ่านผ่าน Atlassian connector
ถ้ามี) → ถามสิ่งที่ยังขาดในข้อความเดียว → ร่าง → ตรวจตัวเองว่าเป้าหมายทุกส่วนมีเกณฑ์รองรับ
→ ให้ดูแล้วแก้ → **สร้าง ticket จริงเมื่อผู้ใช้สั่งเท่านั้น** (ถ้าไม่มี connector จะให้เป็น
ข้อความไปวางเอง)

ticket จาก `gojira` ใช้เป็นแหล่งข้อมูลให้ `crewsade` ได้ตรงๆ — เกณฑ์ตรวจรับที่ตอบได้ว่า
ใช่หรือไม่ใช่ คือสิ่งที่ auditor ต้องการพอดี

### `bulletin` — สรุปงานที่ทำเสร็จ

เรียกได้ทั้งพิมพ์ `/bulletin` หรือพูดว่า "สรุปงาน", "เขียน PR description", "รายงาน PM"
หรือวางสรุปยาวๆ จาก AI มาให้ย่อ

ผลลัพธ์เป็นรูปแบบตายตัว อ่านจบได้ในไม่ถึง 30 วินาที อยู่ใน code block เดียวพร้อม copy:

```
Jira: <ticket URL>

What was done:
- <item>

What has been tested:
- <item>

Notes:            ← ใส่เฉพาะเมื่อมีสิ่งที่ผู้อ่านต้องรู้หรือทำก่อน merge
- <item>
```

- บอกว่า**ทำอะไร** ไม่บอกว่าทำยังไงหรือทำไม ข้อละบรรทัดเดียว หมวดละ 3–7 ข้อ
- ไม่ใส่หลักฐาน ตัวเลขพิสูจน์ เหตุผลการออกแบบ หรือบั๊กที่เจอแล้วแก้ในงานเดียวกัน
- หมวด tested จัดกลุ่มตามส่วน เช่น `Header: token ว่าง, ยาวเกิน` และใช้ลูกศรบอกผล
  เช่น `เลือกสาขาซ้ำ -> ได้ BRANCH_CONFLICT ไม่ใช่ 500`
- ผู้อ่าน 3 แบบ: `pr` (default — ใช้ชื่อ package / endpoint ได้), `pm` (ไม่มีชื่อในโค้ด
  เล่าเป็นผลต่อผู้ใช้), `jira` (แบบ pm แต่เก็บ error code / endpoint ที่คนอาจค้นหา)

หาเนื้อหาจาก: สิ่งที่ผู้ใช้ให้มาในแชท → diff กับ base branch → commit message → ไฟล์เทส
→ Jira key จากชื่อ branch ถ้าหา URL ของ ticket ไม่เจอจะถาม ไม่เดา **ไม่สร้างหรือแก้
PR / MR / ticket เอง** ให้แค่ข้อความ
