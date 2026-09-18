---
name: grill-jera-task
description: Grill session for a Jira task — reads the Jira ticket via MCP, checks prior work in the Obsidian vault, understands the codebase, then relentlessly interviews the user and saves the full Q&A to the vault.
disable-model-invocation: true
---

# Grill Jira Task

A `/grilling`-style session anchored to a Jira task. Follow the phases in order.

## Phase 1: Get the Jira task

Check whether the user has already provided a Jira task (a ticket key like `LMP-1234`, a Jira URL, or a pasted ticket) in this conversation or as the skill argument.

- If **not provided**: ask the user for the Jira task (key or URL) and STOP. Do not proceed until they give one.
- If **provided**: extract the task ID (e.g. `LMP-4827`) and continue.

## Phase 2: Read and understand

Do all of the following before asking the user anything:

1. **Read the Jira ticket** using the Atlassian MCP tools (`getJiraIssue`). Read the summary, description, acceptance criteria, comments, and linked issues. If the MCP call fails or the ticket is not found, tell the user and ask them to verify the task ID.
2. **Check the Obsidian vault for prior work.** Resolve `{vault root}` first: check `~/.lmp-skills/config.json` for a `vaultRoot` field and use it if present. Otherwise, use `~/Desktop/LMP/lmp-task-prd` if it exists, or ask the user once where their vault is if it doesn't — either way, save the resolved path into `~/.lmp-skills/config.json` under `vaultRoot` (create the file/folder if needed) so future runs, of this skill or any other in the pipeline, read the cache instead of asking again. Look in `{vault root}/tickets/{TASK-ID}/`:
   - If the folder exists, read every file in it (prd.md, implementation-plan.md, grill.md, etc.) — this task may have been worked on before. Summarize to the user what already exists, and take it into account so you don't re-ask questions that are already answered.
   - Also skim the vault README at `{vault root}/README.md` for conventions if you haven't before.
3. **Understand the current codebase.** Explore the parts of the codebase the ticket touches so that *facts* can be looked up instead of asked. Use subagents for broad exploration if needed.

Then give the user a short brief: what the ticket asks for, what prior docs exist in the vault (if any), and which parts of the codebase are involved.

## Phase 3: Grill session

Interview the user relentlessly about this task until you reach a shared understanding. Map it as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round — number each question and give your recommended answer — then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round of answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (codebase, Jira ticket, vault, tools), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

Keep a running record of every round — question title, question body, your recommendation, and the user's answer (you need it verbatim in Phase 4).

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not enact any plan until the user confirms shared understanding has been reached.

## Phase 4: Save the grill transcript

When the grill session is finished (the frontier is empty and the user confirms shared understanding, or they say to wrap up), write the full transcript to the Obsidian vault:

**Path:** `{vault root}/tickets/{TASK-ID}/grill.md`

Create the `{TASK-ID}` folder if it doesn't exist. If a `grill.md` already exists from a previous session, append the new session under a dated heading instead of overwriting — และ**อัปเดตกล่อง TL;DR กับตารางสรุปการตัดสินใจข้างบนให้รวมของรอบใหม่ด้วย** (ข้อที่ถูกกลับมติ ให้ขีดฆ่าของเดิมแล้วเพิ่มแถวใหม่ชี้ไปที่ session ล่าสุด) ห้ามปล่อยให้สรุปข้างบนเป็นของเก่า

**Template** — สรุปการตัดสินใจไว้บนสุด (คนส่วนใหญ่อ่านแค่ตารางนี้) แล้วค่อยตามด้วย Q&A เต็มแบ่งตามรอบ:

```markdown
# Grill — {TASK-ID} | {ชื่อ Task}

> [!summary] สรุป 30 วินาที
> - **งานนี้คือ:** {1 ประโยค}
> - **กริลไป:** `{n}` รอบ `{m}` คำถาม · `{YYYY-MM-DD}`
> - **ตัดสินใจสำคัญที่สุด:** {ข้อเดียวที่ถ้าพลาดแล้วงานเปลี่ยนทิศ}
> - **ยังค้าง:** {สิ่งที่ยังไม่มีคำตอบ ถ้าไม่มีเขียน "ไม่มี"}

## สรุปการตัดสินใจ

| # | เรื่อง | สรุปว่าเอายังไง | อยู่ที่ |
|---|---|---|---|
| 1 | {ชื่อประเด็น} | {คำตอบสั้น ๆ แบบตัดสินแล้ว} | Q1 |
| 2 | {ชื่อประเด็น} | {...} | Q4 |

---

## Q&A เต็ม

### Round 1

#### Q1 — {question title}

{คำถามเต็ม รวม choices ที่ให้ไว้}

➡️ **คำแนะนำ:** {recommendation ที่เสนอไป}

✅ **คำตอบ:** {คำตอบของ user}

#### Q2 — {question title}

...

### Round 2

...
```

Readability rules:

- **ตาราง "สรุปการตัดสินใจ" ต้องครบทุกการตัดสินใจ** — ทุกแถวชี้ไปที่ `Q{n}` ที่เป็นที่มา คนที่อ่านแค่ตารางนี้ต้องเดินงานต่อได้
- **1 แถว = 1 การตัดสินใจ** สรุปแบบตัดสินแล้ว (`ใช้ X`) ไม่ใช่เล่าเรื่อง (`คุยกันว่าอาจจะ...`)
- คำถาม/คำตอบยาว ๆ เก็บของเต็มไว้ใน Q&A ข้างล่าง อย่าไปยัดในตาราง
- ห้ามตัดคำถามไหนทิ้งจาก Q&A เต็ม แม้คำตอบจะสั้นแค่ "ตามที่แนะนำ"

Record the user's answers faithfully (their actual decision, not a paraphrase that loses detail). If you gave a recommendation and the user simply accepted it, record the accepted recommendation as the answer. Facts you looked up yourself instead of asking don't become questions — fold them into the question body or the answer as context.

Finish by telling the user the file was saved and paste the **สรุปการตัดสินใจ** table back into the chat — that table is the summary; don't write a separate paragraph.
