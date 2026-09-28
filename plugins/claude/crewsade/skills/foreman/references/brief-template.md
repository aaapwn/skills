# Brief template

Every brief is self-contained: the agent starts with none of your context. Fill every
section; write "none" rather than leaving one out.

```
## Goal
What to do, and what it is for.

## Read first
- .crewsade/config.md
- .crewsade/lessons.md (if it exists)
- .crewsade/context/<files that matter for this sub-task>
- .crewsade/reports/<earlier reports for this sub-task, if any>

## Scope
Files and modules to change. Paths not to touch (from config.md, plus any for this task).

## Acceptance criteria
Each AC of this sub-task, with its check: auto | inspect | human.

## Decision log
Every approved decision so far, from plan.md.

## Report
Write the full report to .crewsade/reports/<sub-task id>-<agent>-<round>.md
and reply in your agent's report format.
```

**For the auditor, add:**

```
## Original requirement
The user's requirement as they gave it — ticket text or their words — not only the AC.

## Under review
What to check: the files in CHANGED, the branch, or the uncommitted changes.
```

**For a scout, replace Scope and Acceptance criteria with:**

```
## Questions
What this scout must find out, as a numbered list. For a ticket, the scout also reads its
siblings and reports disagreements and unowned work. For a reference branch, it returns the
Keep / Do not copy table.

## Output
.crewsade/context/<topic>.md
```

**For an auditor plan review, use:**

```
## Mode
plan review

## Read first
- .crewsade/plan.md
- .crewsade/context/<all context files>

## Original requirement
The user's requirement as they gave it.

## Report
.crewsade/reports/plan-review-<round>.md
```
