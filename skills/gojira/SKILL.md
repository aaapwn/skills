---
name: gojira
description: Write a Jira task (story, task, or sub-task) with a goal, scope and acceptance criteria that a developer can build from and an auditor can check against. Use this whenever the user wants to create, draft, write, or rewrite a Jira ticket, task, story, or requirement, or says things like "สร้าง task", "เขียน ticket", "เปิด Jira", "เขียน requirement", even if they don't mention acceptance criteria.
---

# Jira Task

Write a ticket that serves two readers at once:

1. **The developer**, who needs to know what to build and where the edges are.
2. **The auditor**, who must decide "done or not done" by checking each criterion one by one, without asking anyone.

If a criterion cannot be checked as yes or no, it is not finished.

## Output format

### Summary

```
[<Feature or area>] <verb> <deliverable>
```

- The bracket names the feature or area, short enough to scan in a board view.
- After the bracket, start with a verb and say what gets delivered.
- Keep the whole line under about 80 characters.

Example: `[MCP & เอกสาร] ส่งมอบ MCP เก็บเอกสาร, หน้าดูเอกสารต่อ task และ Claude Desktop extension`

### Description

```markdown
## เป้าหมาย

<1–3 short paragraphs: what this task achieves and why. Describe the end
state, not the steps to get there.>

<Optional: related pages, endpoints, or documents as a short list.>

## ขอบเขตและเกณฑ์ตรวจรับ

### 1. <Area>

- <criterion>
- <criterion>

### 2. <Area>

- <criterion>

### N. การทดสอบ

- <what must be tested, and how>

## หมายเหตุ

**ของเดิมที่มีอยู่แล้วและให้ใช้ต่อ** — <existing code, tables, prototypes to reuse>

**อยู่นอกขอบเขตโดยตั้งใจ** — <things a reader might expect but are not in this task>

**ข้อจำกัดที่รู้และยอมรับ** — <known gaps accepted for this round, with the reason>
```

Leave out any `หมายเหตุ` paragraph that has nothing in it. Leave out the whole section if all three are empty.

## How to write criteria

Each bullet is **one** claim an auditor can verify.

- **Observable, not procedural.** Describe what must be true when the work is done, not the steps to get there. "ทุกหน้ามีสถานะว่าง กำลังโหลด ผิดพลาด" not "เพิ่ม loading state ให้ทุก component".
- **Name the contract when it matters.** Exact tool names, field names, endpoints, error codes, and status values belong in criteria, because they are what the auditor will check.
- **No vague words without a number or a rule.** Words like เร็ว, ง่าย, เหมาะสม, ปลอดภัย, ครบถ้วน must be replaced with something checkable. "token ต้องเก็บใน Keychain และส่งผ่าน environment ไม่ใช่ argv" instead of "เก็บ token อย่างปลอดภัย".
- **State failure behaviour.** When something can be rejected, say what the caller gets back.
- **One claim per bullet.** If a bullet contains "และ" joining two independent checks, split it unless they genuinely stand or fall together.
- **Group by area**, numbered, so a criterion can be referred to as "2.3".
- **Always end with a testing area** that says what kind of tests must exist (unit, integration, manual walkthrough) and what they must cover. Point back to other areas by number rather than repeating them.

## Workflow

1. **Collect what exists.** Read whatever the user points to: Confluence pages, design links, existing tickets, code paths, notes. If they give a ticket key or URL and an Atlassian connector is available, read it with the connector instead of asking them to paste it.
2. **Find the gaps.** Before drafting, check that you know: the goal, who or what uses the result, the areas in scope, what is deliberately out of scope, and what already exists to reuse. Ask about the missing ones together in one message. Do not invent scope.
3. **Draft** the summary and description in the format above.
4. **Self-check** before showing it:
   - Every part of the goal is covered by at least one criterion.
   - Every criterion can be answered yes or no.
   - There is a testing area.
   - Anything the user mentioned as "not now" or "later" is under `อยู่นอกขอบเขตโดยตั้งใจ`.
5. **Show the draft** to the user and revise.
6. **Create the ticket only when the user says so.** Confirm the project key, issue type, and parent (for sub-tasks) first. If no Atlassian connector is available, give the text ready to paste.

## Language

Write in the user's language. Keep code identifiers, field names, and error codes in their original form inside backticks. Keep the section headings exactly as in the template.
