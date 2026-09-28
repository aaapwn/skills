# Plugins

Plugin สำหรับ Claude Code ใน repo นี้ ทุกตัวอยู่ใน marketplace `aaapwn-skills`

| Plugin | ใช้ทำอะไร |
| --- | --- |
| [`crewsade`](claude/crewsade) | ทำงานเป็นทีม — session หลักเป็นหัวหน้างาน แจกงานอ่าน เขียน และตรวจให้ agent |

## ติดตั้ง

เพิ่ม marketplace ครั้งเดียว:

```bash
claude plugin marketplace add aaapwn/skills
```

แล้วติดตั้ง plugin ที่ต้องการ:

```bash
claude plugin install crewsade@aaapwn-skills
```

---

# crewsade

เปลี่ยน session หลักของ Claude Code ให้เป็น **foreman** (หัวหน้างาน) ที่คุยกับผู้ใช้ วางแผน
ตัดสินใจ และประสานงาน ส่วนงานหนักอย่างอ่านโค้ด เขียนโค้ด และตรวจงาน แจกให้ agent ในทีมทำ

ผลคือ context ของ session หลักเก็บแค่ requirement แผน การตัดสินใจ และผลสรุป ไม่เต็มไปด้วย
โค้ดที่อ่าน output ของเทส หรือการลองผิดลองถูก ทำงานยาวหลาย sub-task ได้โดยไม่ต้องเปิด
session ใหม่

งานหนึ่งชุดที่สั่ง ตั้งแต่รับงานจนส่งมอบ เรียกว่า **mission**

## เริ่มใช้

ครั้งแรกในแต่ละโปรเจกต์ ให้ตั้งค่าก่อน:

```
/crewsade:foreman init
```

foreman จะส่ง scout ไปสำรวจโปรเจกต์ หาคำสั่ง test / lint / build แล้วถามยืนยัน Definition
of Done, path ที่ห้ามแตะ และจะให้คอมมิตทุก sub-task หรือไม่ จากนั้นเขียน
`.crewsade/config.md`

แล้วสั่งงานได้เลย:

```
/crewsade:foreman ทำ LMWN-1234 ตาม Confluence หน้านี้ <url>
```

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| `/crewsade:foreman init` | ตั้งค่าโปรเจกต์ รันซ้ำเพื่อแก้ config ได้ |
| `/crewsade:foreman <งาน>` | เริ่ม mission ใหม่ ถ้ายังไม่เคย init จะ init ให้ก่อน |
| `/crewsade:foreman status` | ดู sub-task ทั้งหมด สถานะ และจำนวนรอบที่ตรวจไม่ผ่าน |
| `/crewsade:foreman resume` | ทำ mission ต่อหลัง session หลุด หรือหลัง context ถูกสรุปย่อ |
| `/crewsade:foreman audit` | ส่ง auditor ตรวจงานที่มีอยู่ (branch ปัจจุบัน หรือของที่ยังไม่คอมมิต) โดยไม่เริ่ม mission |
| `/crewsade:foreman ship` | push และเปิด PR/MR หลังเช็ค remote และ CI config — ทำเมื่อสั่งเท่านั้น |
| `/crewsade:foreman abort` | หยุด mission และสรุปว่าทำอะไรไปแล้ว ไม่ revert โค้ด |

## ทีมงาน

| Agent | หน้าที่ | เขียนไฟล์ | รันพร้อมกันได้ |
| --- | --- | --- | --- |
| `crewsade:scout` | อ่านเอกสาร (Jira, Confluence, Markdown) และสำรวจ codebase | เฉพาะ `.crewsade/context/` | ได้ |
| `crewsade:developer` | เขียนและแก้โค้ดพร้อมเทส | โค้ด | ไม่ได้ |
| `crewsade:auditor` | ตรวจงานกับ DoD และ AC, รีวิวแผนก่อนอนุมัติ | เฉพาะ `.crewsade/reports/` | ได้ |
| `crewsade:worker` | งานที่ไม่ใช่โค้ด เช่น เอกสาร config รวบรวมข้อมูล | ไฟล์ใน scope | ไม่ได้ ถ้ามีการเขียนไฟล์ |

หลักการที่ foreman ยึด:

1. **เขียนได้ทีละตัว** agent ที่เขียนไฟล์รันได้ทีละตัว ตัวที่อ่านอย่างเดียวรันพร้อมกันได้
2. **ส่ง context ผ่านไฟล์** agent เขียนผลเต็มลงไฟล์ foreman อ่านแค่สรุป แล้วส่ง path ต่อ
3. **ทุกการตัดสินใจอยู่ใน decision log** และทุก brief แนบ log นี้ไปด้วย
4. **คนตรวจไม่ใช่คนทำ** งานทุกชิ้นต้องผ่าน auditor ที่ไม่ได้เขียนเอง
5. **งานเล็กไม่แจก** ถ้าเขียน brief ยาวกว่าลงมือทำ foreman ทำเอง

## Flow ของ mission

1. **รับงาน** — foreman สรุปงานสั้นๆ
2. **หาแหล่งข้อมูล** — ขอเป็น ticket key, URL หรือ path ไม่ต้อง copy เนื้อหามาวาง
3. **สำรวจ** — scout อ่านเอกสารและ codebase พร้อมกันหลายตัว รวมถึง ticket ข้างเคียง
   (parent และ subtask อื่น) และ reference branch ถ้ามี และมี **baseline scout** เสมอ:
   ดูว่าส่วนที่จะแก้ทำงานยังไงตอนนี้ มีเทสอะไรครอบ มีงานเดิมของ task นี้ไหม (commit, branch,
   PR) และรัน DoD ก่อนแก้ เพื่อให้ auditor แยกได้ว่าเทสที่พังเป็นของเดิมหรือของใหม่
4. **วางแผน** — แตก sub-task พร้อม AC และวิธีตรวจของแต่ละข้อ
5. **รีวิวแผน** — auditor ถามว่ามีทางที่ง่ายกว่าไหม และแผนสมมติอะไรที่ไม่จริง
6. **อนุมัติ** — ผู้ใช้ดูแผน AC และทางเลือกที่ auditor เสนอ ก่อนแก้โค้ดใดๆ
7. **พัฒนาและตรวจ** — ทีละ sub-task: developer ทำ → foreman เช็ค assumption → auditor ตรวจ
   ถ้าไม่ผ่าน foreman คัดเฉพาะข้อที่ต้องแก้จริงส่งกลับ ถ้าไม่ผ่านครบ 2 รอบ หยุดถามผู้ใช้
8. **ตรวจรวม** — auditor ตรวจทั้ง mission อีกรอบ กับระบบที่รันจริงถ้ารันได้
9. **ส่งมอบ** — สรุปผล acceptance report, decision log, จุดที่ต่างจากแผน และรายการที่ผู้ใช้
   ต้องตรวจเอง

งานเล็กที่มีเอกสารครบอยู่แล้ว ข้าม scout ที่อ่านเอกสารได้ แต่ห้ามข้าม baseline scout ส่วน
mission ที่มี sub-task เดียวและเล็ก ข้ามขั้น 5 และ 8 ได้

## มาตรฐานงานสองชั้น

- **Definition of Done (DoD)** — มาตรฐานกลางของโปรเจกต์ ใช้กับทุก sub-task กำหนดตอน `init`
  เช่น เทสผ่านทั้งชุด lint ผ่าน build ผ่าน ไม่มี warning ใหม่
- **Acceptance Criteria (AC)** — เงื่อนไขเฉพาะของแต่ละ sub-task แต่ละข้อระบุวิธีตรวจ:
  - `auto` ตรวจด้วยคำสั่งหรือเทส
  - `inspect` auditor อ่านโค้ดแล้วอ้าง `file:line`
  - `human` ผู้ใช้ต้องดูเอง เช่น หน้าตา UI หรือพฤติกรรมบน staging

auditor ให้ผลเป็น `PASS`, `FAIL` หรือ `NEEDS-HUMAN` พร้อมหลักฐานรายข้อ เทสที่พังหรือ
warning ที่มีอยู่แล้วใน baseline จะรายงานแยกเป็น `PRE-EXISTING` ไม่นับเป็น FAIL

## เมื่อ agent มีคำถาม

agent ถามผู้ใช้เองไม่ได้ เลยใช้วิธีนี้แทน:

- **คำถามเล็ก** — agent ตัดสินใจเองอย่างสมเหตุสมผล แล้วบันทึกใน `ASSUMPTIONS`
- **คำถามที่ทำต่อไม่ได้** — agent หยุดแล้วส่ง `STATUS: needs-input` พร้อมคำถาม
- foreman ตอบเองก่อน ถ้าตอบไม่ได้จึงถามผู้ใช้ทีละข้อ ถ้าคำตอบพูดถึง tool, flag หรือ config
  จะเช็คของจริงก่อนบันทึก แล้วส่งคำตอบกลับไปให้ agent ตัวเดิมทำต่อ

## ไฟล์ที่ใช้ระหว่างทำงาน

```
.crewsade/
├── config.md    ← จาก init: DoD, คำสั่ง test/lint/build, stack, path ที่ห้ามแตะ
├── plan.md      ← mission ปัจจุบัน: sub-task, สถานะ, AC, decision log
├── lessons.md   ← บทเรียนจาก mission ก่อนๆ ทุก brief ให้อ่าน
├── context/     ← ผลเต็มจาก scout
└── reports/     ← report เต็มจาก developer, worker และ auditor
```

ตอน `init` foreman จะถามว่าจะเพิ่ม `.crewsade/` ลง `.gitignore` หรือไม่

## Skill ที่ agent ใช้

| Agent | Skill |
| --- | --- |
| developer | `crewsade:proof`, `karpathy-guidelines` |
| auditor | `crewsade:proof`, `scrutinize` |
| worker | `karpathy-guidelines` |

- **`crewsade:proof`** มากับ plugin เป็นกฎว่าจะรู้ได้ยังไงว่างานใช้ได้จริง ไม่ใช่แค่เทสเขียว
  เช่น เทสต้องแดงเมื่อไม่มี fix, ตัดสินจาก exit code, comment ต้องอ้างสิ่งที่พิสูจน์แล้ว
  developer ใช้ตอนเขียน auditor ใช้กฎชุดเดียวกันตอนจับผิด
- **`karpathy-guidelines`** และ **`scrutinize`** เป็น skill ภายนอก ไม่ได้มากับ plugin
  แนะนำให้ติดตั้งเพิ่ม ถ้าไม่มี Claude Code จะข้ามไป และ agent จะใช้กฎแกนที่เขียนสำรองไว้ในตัว

## ควรใช้เมื่อไหร่

**ควรใช้** กับงานยาวหลาย sub-task, งานที่ต้องอ่านโค้ดหรือเอกสารเยอะ และงานที่ต้องถูกต้องสูง

**ไม่ควรใช้** กับงานสั้นที่ทำจบใน session เดียวได้สบาย, งานที่ต้องคุยโต้ตอบตลอด และงานสำรวจ
ที่ยังไม่รู้เป้าหมาย

## ข้อจำกัดที่ควรรู้

- **ใช้ token มากกว่าทำคนเดียว** เพราะ agent แต่ละตัวต้องอ่าน context ของตัวเองใหม่
- **scout ที่อ่าน Jira หรือ Confluence ต้องรันแบบ foreground** เพราะ agent ที่รัน background
  ใช้ MCP tool ไม่ได้
- **scout กับ auditor ห้ามแก้ไฟล์โปรเจกต์ ด้วยคำสั่งใน prompt เท่านั้น** เพราะ plugin agent
  ตั้ง permission หรือ hook เองไม่ได้ ทั้งสองตัวยังมี `Write` และ `Bash` ไว้เขียน report

## พัฒนา plugin

โหลดจาก disk ตรงๆ แก้ไฟล์แล้วใช้ `/reload-plugins` ได้เลย ไม่ต้องติดตั้งใหม่:

```bash
claude --plugin-dir ./plugins/claude/crewsade
```

เช็คทุกครั้งหลังแก้ (รันจาก root ของ repo):

```bash
claude plugin validate . && claude plugin validate ./plugins/claude/crewsade
```

ดูว่าโหลด component อะไรบ้าง และใช้ token เท่าไหร่:

```bash
claude --plugin-dir ./plugins/claude/crewsade plugin details crewsade
```
