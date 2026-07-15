---
name: jira-testing
description: Execute the testing plan for a Jira task using a 3-tier hybrid — API tests and Playwright E2E in a personal test workspace (never touching the work repo), plus Claude in Chrome for visual/exploratory cases — then record pass/fail per TC and every bug found (record only, never fix) in the Obsidian vault.
disable-model-invocation: true
---

# Jira Testing

This skill executes `testing-plan.md` against the actual running application. Strategy: **automate everything that is cheap to automate** (tokens are paid once at authoring time; script reruns are free), and spend browser-agent time only where human-like judgment is needed.

Two hard rules:

1. **When a test fails, record the bug — do NOT fix it.** Fixing is a separate decision for the user. Keep executing the remaining TCs after a failure.
2. **Never write test files, configs, or dependencies into the work repo.** All automated tests are personal tooling and live in the personal test workspace (below). The work repo's working tree must be byte-identical before and after this skill runs.

## Personal test workspace

All Playwright code lives in one standalone project, reused across every ticket:

```
{{PLAYWRIGHT_WORKSPACE}}/
├── package.json          # playwright + @playwright/test เท่านั้น
├── playwright.config.ts  # baseURL ชี้ localhost ของแอปที่เทส
├── auth/                 # storageState ราย role (gitignore ถ้า workspace เป็น git)
│   ├── staff.json
│   └── admin.json
├── helpers/              # auth helper, seed helper ฯลฯ ใช้ร่วมทุก ticket
└── tests/
    ├── LMP-4827/         # spec ราย ticket
    │   ├── api.spec.ts   # Tier 1
    │   └── e2e.spec.ts   # Tier 2
    └── LMP-XXXX/
```

- **First run ever:** if this folder doesn't exist, bootstrap it (`npm init playwright@latest`, minimal config) — this is a one-time cost.
- **Every subsequent ticket:** just add `tests/{TASK-ID}/` specs. Reuse and extend `helpers/` (auth, seeding) instead of duplicating per ticket.
- baseURL, test accounts, and env config go in the workspace's config/`.env` — never hard-code secrets in specs.

## Authentication — Okta FastPass

The app logs in via Okta FastPass (device-bound, Okta Verify). **The login step itself cannot be scripted** — do not attempt to automate the Okta flow, fill Okta forms, or work around device trust, and do not suggest alternative auth setups (backend bypass, test accounts, TOTP). The one and only auth strategy is: **manual FastPass login once → save Playwright `storageState` → every test reuses it.**

1. **Before running any test**, validate each role's saved state in `auth/{role}.json` by hitting an authenticated endpoint (or loading an authenticated page) with it.
2. **If a state file is missing or expired:** open a **headed** browser (`page.pause()` in a small `helpers/login.ts` script), navigate to the app, and tell the user: "กด login ด้วย FastPass ให้หน่อย (role: {role}) เสร็จแล้วกด Resume" — the human does FastPass once, then the script saves `context.storageState({ path: 'auth/{role}.json' })`.
3. **All specs consume the state** — browser tests via `test.use({ storageState: 'auth/{role}.json' })`, and Tier 1 API tests via a `request` context created with the same `storageState` file (cookies/bearer ride along automatically).
4. One state file **per role** in the testing plan (staff, admin, viewer, ...). Only re-prompt the user for roles whose sessions actually expired — don't ask for all of them every run.
5. If the ticket needs a role the user has no account for, mark those TCs as `skip` with the reason — don't block the whole run.

Tier 3 (Claude in Chrome) is unaffected — it uses the user's real Chrome, already logged in.

## Phase 1: Gather sources

1. **Identify the task ID** (e.g. `LMP-4827`) from the conversation or the skill argument.
2. **Read the ticket folder** `{{VAULT_ROOT}}/tickets/{TASK-ID}/`:
   - `testing-plan.md` — the checklist to execute. If missing, stop and tell the user to run `/to-testing-plan` first.
   - `requirement.md` and `implementation-plan.md` — needed to judge expected behavior and find the API endpoints/pages under test.
3. **Figure out how to run the app locally** (dev server command, port, seed data, env). Prefer an existing `.claude/launch.json` or project run skill. Confirm the app actually starts and is reachable before writing any test.
4. **Check the personal workspace** — bootstrap it if this is the first run, otherwise check `helpers/` for reusable login/seed utilities from previous tickets.

## Phase 2: Classify every TC into a tier

Go through every TC in `testing-plan.md` and assign exactly one tier:

| Tier | ใช้กับ | เครื่องมือ |
|---|---|---|
| **1 — API-level** | TC ที่พิสูจน์ได้ที่ backend ล้วน: validation, permission ราย role, error response, business logic, format ของข้อมูล | Playwright `request` context (ไม่เปิด browser) ใน workspace ส่วนตัว — ควรเป็นถังใหญ่ที่สุด |
| **2 — Browser E2E** | TC ที่ต้องใช้ UI จริง: flow เต็มของ user, สถานะปุ่ม/disable, download ไฟล์, multi-tab, การกดซ้ำ | Playwright browser test ใน workspace ส่วนตัว |
| **3 — Claude in Chrome** | TC ที่ต้องตัดสินด้วยตา (layout, ข้อความ, UX), เคสที่ automate แพงเกินคุ้ม + exploratory pass 1 รอบท้ายสุด | Chrome browser tools — ใช้ quota เฉพาะจุดที่ script ทำแทนไม่ได้ |

Rules of thumb: if a TC can drop to a lower tier, drop it (2→1 whenever the UI part isn't the thing being tested). Tier 3 should be the smallest bucket — roughly the visual/exploratory tail, not the default.

Show the user the classification summary (count per tier + which TCs landed in tier 3 and why) before executing, then proceed — don't wait for approval unless they've asked to review first.

## Phase 3: Execute tier by tier

Start the app (dev server) first — every tier needs it running.

### Tier 1 — API tests (Playwright request context)

- Write `tests/{TASK-ID}/api.spec.ts` in the personal workspace, hitting the locally running app's endpoints directly. Test each role's permissions by logging in as different test accounts via the shared login helper.
- Name each test with its TC id (e.g. `TC-04: viewer role cannot see export`) so results map back to the plan.
- Run them. Record pass/fail per TC with the failure output.

### Tier 2 — Browser E2E (Playwright)

- Write `tests/{TASK-ID}/e2e.spec.ts`, one TC per test where practical, TC id in the test title.
- Write to a reusable standard even though it's personal tooling — stable selectors, no hard-coded sleeps, seeded/isolated test data — because these specs are what makes re-testing free after every bug fix.
- **Selector strategy** (never add `data-cy`/`data-testid` to the work repo — that violates the no-repo-changes rule):
  1. If the frontend already has `data-cy`/`data-testid` attributes, use them read-only (set `testIdAttribute` in playwright.config accordingly).
  2. Otherwise prefer Playwright's user-facing locators: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`.
  3. If an element genuinely can't be located stably, either move that TC to Tier 3, or tell the user they can add a `data-cy` themselves as part of their feature-branch dev work (their code, their call) and the spec will use it — the skill never edits the repo on their behalf.
- Run headless. Record pass/fail per TC; capture screenshots/traces for failures.

### Tier 3 — Claude in Chrome

- Load the Chrome tools via ToolSearch in one batch, then drive the real browser through each tier-3 TC: perform the steps, observe, and judge against the expected result in the plan.
- Finish with **one exploratory pass**: wander the feature like a curious user — weird inputs, fast clicking, back-button, resize — and note anything off, even if no TC covers it (mark such findings as `exploratory`, not a TC).
- Record pass/fail per TC with what was actually observed; screenshot anything that fails.

## Phase 4: Record results

One task gets tested multiple rounds (test → fix → re-test), so results are kept **one file per round** — never overwrite a previous round:

- Folder: `{{VAULT_ROOT}}/tickets/{TASK-ID}/test-results/`
- Filename: `round-{NN}-{YYYY-MM-DD}.md` — look at existing files in the folder to pick the next round number (first run = `round-01`)

Write in Thai, technical terms in English:

```markdown
# Test Results — {TASK-ID} | รอบที่ {NN}

{สรุป: เทสวันไหน กับ environment ไหน branch/commit ไหนของ repo งาน ผลรวม ผ่าน/ไม่ผ่าน — ถ้าเป็นรอบที่ 2 ขึ้นไป บอกด้วยว่ารอบนี้เทสซ้ำเพราะอะไร (เช่น หลังแก้ BUG-01, BUG-03 จากรอบก่อน)}

## สรุปผล

| Tier | ผ่าน | ไม่ผ่าน | Skip | หมายเหตุ |
|---|---|---|---|---|
| 1 — API | 12 | 1 | 0 | |
| 2 — E2E | 8 | 2 | 0 | |
| 3 — Chrome | 4 | 1 | 1 | TC-31 skip เพราะ {เหตุผล} |

## ผลรายเคส

| TC | Test Case | สถานะ | สาเหตุ (ถ้าไม่ผ่าน) |
|---|---|---|---|
| TC-01 | ส่งออกออเดอร์ทั้งหมดด้วยคอลัมน์เริ่มต้น | ✅ ผ่าน | |
| TC-04 | ปุ่มส่งออกถูก disable ระหว่าง export | ❌ ไม่ผ่าน | ปุ่มยังกดซ้ำได้ระหว่างรอ response — ดู BUG-01 |
| TC-31 | {ชื่อเคส} | ⏭️ Skip | {เหตุผลที่เทสไม่ได้} |

## บัคที่พบ

### BUG-01 — {หัวข้อบัคสั้น ๆ} `[TC-04]`
- **ความรุนแรง:** {blocker / major / minor / cosmetic}
- **ที่พบ:** {tier + หน้า/endpoint}
- **ขั้นตอน reproduce:** {ทีละ step ที่ทำซ้ำได้จริง}
- **คาดหวัง:** {จาก requirement/testing plan}
- **ที่เกิดจริง:** {สิ่งที่เห็น พร้อม error message/screenshot ถ้ามี}
- **จุดที่น่าจะเกี่ยว:** {ไฟล์/ฟังก์ชันใน repo งานที่สงสัย ถ้าพอชี้ได้ — ชี้เฉย ๆ ไม่แก้}

## Test scripts

- Spec: `{{PLAYWRIGHT_WORKSPACE}}/tests/{TASK-ID}/` — รันซ้ำได้ด้วย `npx playwright test tests/{TASK-ID}` หลังแก้บัค
```

Every TC in the testing plan must appear in the per-case table — passed, failed, or skipped with a reason. No silent omissions. The สถานะ column uses exactly: `✅ ผ่าน`, `❌ ไม่ผ่าน`, `⏭️ Skip` — and every ❌ must have a สาเหตุ.

On re-test rounds (round 2+), read the previous round's file first: focus the summary on what changed (which bugs got fixed, which TCs flipped from ไม่ผ่าน to ผ่าน, any new regressions), but still record every TC in the per-case table.

## Phase 5: Report

Tell the user: which round this was, overall pass/fail counts (with change vs. the previous round if any), each bug found in one line with severity, the rerun command for the ticket's specs, and the path to the round file in `test-results/`. Confirm the work repo was not modified. Do not fix anything — offer "แก้บัคแล้วรันเทสซ้ำ" as the next step and stop.
