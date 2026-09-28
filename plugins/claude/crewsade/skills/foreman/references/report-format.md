# Report formats

Each agent file carries its own copy of its format. Change both places together.

## Scout, developer, worker

```
STATUS: done | partial | needs-input
CHANGED: files changed (scout: none)
ASSUMPTIONS: what the agent decided on its own along the way
QUESTIONS: (needs-input only)
DETAILS: path to the full report
```

## Auditor

```
VERDICT: PASS | FAIL | NEEDS-HUMAN
DOD: result per item, with evidence (command run and its exit code)
AC: result per item, with evidence
FIX: what must change, with file and line (FAIL only)
DETAILS: path to the full report
```

**Plan review mode:**

```
VERDICT: SOUND | REVISE
ALTERNATIVES: simpler approaches worth the user's attention, with why
PROBLEMS: each with the evidence behind it
DETAILS: path to the full report
```

`VERDICT` is `FAIL` if any item fails, `NEEDS-HUMAN` if nothing fails but a `human` item
remains, and `PASS` only when every item passes.

## How the foreman reads them

- Read the reply, not `DETAILS`. Open the full report only to answer a question the reply
  cannot, or when an audit fails and you need the evidence.
- `partial` means the agent stopped short: find out why before dispatching the next step.
- Check `CHANGED` against the brief's scope with `git status --short`. A file outside scope
  goes back to the agent or to the user — never quietly into a commit.
- Every item in `ASSUMPTIONS` is either confirmed into the decision log or sent back.
- Triage every `FIX` item before it goes back to the developer:
  - **must fix** — it names a failure you can reproduce or a DoD/AC it breaks. Send it.
  - **optional** — real but not blocking, or no reproducible failure. Log it; do not send.
  - **disagree** — it contradicts the decision log or the approved plan. Take it to the user;
    do not send it until they decide.
