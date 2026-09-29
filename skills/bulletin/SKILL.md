---
name: bulletin
description: Write a short summary of completed work for a merge request / pull request description, a status update to a PM, or a Jira comment. Use this whenever the user asks to summarize what was done, write a PR or MR description, report progress to a PM, update a Jira ticket, or says things like "สรุปงาน", "เขียน PR description", "รายงาน PM", even if they don't say "recap". Also use it when the user pastes a long AI-generated summary and wants it shortened.
---

# Recap

Produce a summary a busy reader can scan in under 30 seconds. The reader wants to know **what changed** and **what was tested**. They do not want the reasoning, the process, or the evidence.

## Output format

Always use exactly this shape:

```
Jira: <ticket URL>

What was done:
- <item>
- <item>

What has been tested:
- <item>
- <item>
```

Add one more section only when there is something the reader must act on or know before merging:

```
Notes:
- <item>
```

Use `Notes` for things that are out of scope but a reader might expect, work blocked on someone else, or a ticket that needs correcting. Leave it out when there is nothing like that. Never use it for background or design explanations.

Wrap the whole summary in one code block so the user can copy it.

## Rules for each bullet

- One line per bullet. If a bullet needs a second line, it is doing too much; split it or cut it.
- Say **what**, not **how** or **why**. "Validate ClinicID ต้องมากกว่า 0" is right. "ClinicID <= 0 returns 403 because accounts with clinic_id 0 exist in production" is too much.
- No evidence or numbers used to prove the work (test counts, response sizes, "removed the guard and the test went red"). The reader trusts that tested items were tested.
- Merge related changes into one bullet. Aim for 3–7 bullets per section. If there are more than 7, you are listing implementation details; group them.
- Do not list bugs that were found and fixed during the same piece of work. From the reader's point of view they never existed; the fix is just part of what was done.
- Do not include design rationale, trust models, architecture discussion, or the "Generated with" footer.

## "What has been tested" bullets

Group test scenarios by area, with the area as a short prefix, like `Header: token ว่าง, ยาวเกิน, มีช่องว่าง`. Describe scenarios the way a person would describe them, not test function names. When the outcome matters, show it with an arrow: `เลือกสาขาซ้ำ -> ได้ BRANCH_CONFLICT ไม่ใช่ 500`.

## Audience

Ask which audience only if it is not obvious from the request. Default to `pr`.

- **pr** (reviewers are developers): package, endpoint, and error-code names are fine when they help a reviewer find the change.
- **pm** (product or project manager): no code identifiers. Describe changes by what they do for the product or user. Tested items describe situations, not technical cases.
- **jira** (mixed audience): same as `pm`, but keep error codes or endpoint names that someone may search for later.

## Language

Write in the user's language, keeping technical terms in English the way developers normally say them. Keep the section headings in English exactly as shown above.

## Where to get the content

Use whatever is available, in this order of preference:

1. What the user gave you in the conversation (notes, a pasted long summary, a ticket).
2. The diff against the base branch: `git diff <base>...HEAD --stat` first, then only the files needed to understand each change.
3. Commit messages on the branch: `git log <base>..HEAD --oneline`.
4. Test files added or changed in the diff, for the "tested" section.
5. The Jira key from the branch name or commit messages, to build the ticket URL.

If the Jira URL cannot be found, ask for it rather than leaving a placeholder.

Do not create or edit the PR, MR, or Jira ticket unless the user asks. Just give them the text.

## Example

Input: a long MR description covering authentication middleware, a list of eight definition-of-done items with evidence, a cache trust model, seven bugs found during review, and an out-of-scope table.

Output:

```
Jira: https://linemanwongnai.atlassian.net/browse/LMP-7344

What was done:
- ทำ auth middleware แปลง bearer token เป็น scope (user, คลินิก, สาขา, สิทธิ์) ผ่าน token/me
- Cache scope ใน Redis พร้อม HMAC tag กันการปลอม entry
- Validate ClinicID ต้องมากกว่า 0
- Normalize permissions (ตัดซ้ำและเรียงลำดับ)
- ตัด PII ออกจาก response ของ Jera ก่อนนำไปใช้
- จำกัดความยาว token ไม่เกิน 4096

What has been tested:
- Header: ไม่มี header, header ซ้ำ, scheme ผิด, token ว่าง/ยาวเกิน/มีช่องว่าง
- Backend: ต่อไม่ติด, timeout, 500, 401, 403 -> ไม่ผ่าน auth ทุกกรณี
- เลือกสาขาซ้ำ (409) -> ได้ BRANCH_CONFLICT ไม่ใช่ 500
- Scope ไม่มี user/คลินิก/สาขา หรือ clinic_id เป็น 0 -> 403
- Cache entry ที่ไม่มี HMAC tag -> อ่านไม่ได้
- Response ที่ส่งออกไม่มี PII

Notes:
- ไม่รวม telemetry, CORS และ rate limiter
- colpolicy.Normalize ใน DoD ของ ticket นี้ ควรย้ายไป LMP-7349
```
