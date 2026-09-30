# Skills

Plugin และ skill ส่วนตัวสำหรับ Claude Code repo นี้เป็น plugin marketplace ด้วย
(`aaapwn-skills`)

## Plugins

| Plugin | ใช้เมื่อ |
| --- | --- |
| [`crewsade`](plugins/claude/crewsade) | ทำงานเป็นทีม — `/crewsade:foreman` เปลี่ยน session หลักเป็นหัวหน้างาน แจกงานอ่าน เขียน และตรวจให้ agent 4 ตัว (แนะนำให้ติดตั้ง `karpathy-guidelines` และ `scrutinize` ด้วย ถ้าไม่มี agent จะใช้กฎสำรองในตัว) |

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

> Skill ชุด LMP Jira (`grill-jera-task`, `to-jira-requirement`, ...) ย้ายไปอยู่ GitLab
> ขององค์กรแล้ว ไม่ได้ดูแลที่ repo นี้อีก
