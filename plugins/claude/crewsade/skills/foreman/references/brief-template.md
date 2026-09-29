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

## Done when
The state that ends this piece of work. Stop there — neither short of it nor past it.

## Acceptance criteria
Each AC of this sub-task, with its check: auto | inspect | visual | human.

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
## Done when
Every question below is answered, each marked confirmed or unconfirmed with where you looked.

## Questions
What this scout must find out, as a numbered list. For a ticket, the scout also reads its
siblings and reports disagreements and unowned work. For a reference branch, it returns the
Keep / Do not copy table.

## Output
.crewsade/context/<topic>.md
```

**For the baseline scout, use exactly these questions** (add mission-specific ones after):

```
## Questions
1. Current behaviour: for each part this mission touches, trace it from entry point to side
   effect as it works today, with file:line.
2. Existing tests: which tests cover those parts, and what in them is not covered.
3. Existing work on this task: `git log --all --grep=<key>`, `git branch -a`, open PRs/MRs
   for the key, and any docs or plans in the repo that mention it.
4. DoD before any change: run every command in config.md; record the exit code, each test
   already failing (by name), and the warning count per command. Record `git status --short`
   and `git rev-parse HEAD` first.

## Output
.crewsade/context/baseline.md
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
