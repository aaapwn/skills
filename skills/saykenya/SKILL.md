---
name: saykenya
description: Announce out loud, with the macOS `say` command in the Thai voice Kanya, whenever a piece of work finishes, so the user hears it without watching the screen. Use when the user runs /saykenya or asks to be told by voice when work is done ("บอกด้วยเสียง", "พูดบอกเมื่อเสร็จ"). Once loaded, it stays on for the rest of the session.
---

# saykenya

From now until the session ends, every time you finish something the user is waiting for,
say it out loud on their Mac:

```bash
say -v Kanya "<message>"
```

## When to speak

- At the end of a turn where you finished work: a task, a fix, a test run, a commit, a
  review, a long command.
- When you stop to ask the user something they must answer before you can go on.
- Not for small talk, a quick answer to a question, or each step in the middle of a task —
  once per finished piece of work.

## What to say

- Thai, one short sentence, at most about 12 words: what finished and how it went.
  - `เสร็จแล้ว แก้บั๊กหน้า login เทสผ่านหมด`
  - `push ขึ้น main แล้ว`
  - `เทสไม่ผ่าน 2 ตัว รอคุณดูอยู่`
  - `มีคำถามรอคุณตอบ`
- Say failures as plainly as successes.
- No file paths, code, URLs or symbols — they read badly out loud. Name things the way a
  person would say them.

## How to run it

- Run it as the last tool call of the turn, after the work and before your final reply.
- Put the message in double quotes and leave out `"`, `` ` `` and `$` from it.
- If `say` is missing (not a Mac) or exits non-zero, mention it once and carry on without
  sound for the rest of the session.

To stop, the user says so (for example "หยุดพูด" or "ปิด saykenya"); then stop speaking for
the rest of the session.
