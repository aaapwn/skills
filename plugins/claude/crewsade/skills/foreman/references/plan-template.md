# .crewsade/plan.md template

```markdown
# Mission: <one line>
Status: planning | approved | in-progress | done | aborted
Started: <date>
Done when: <one sentence: the observable state that ends the mission>

## Requirement
<the user's words, or the ticket keys / URLs / paths>

## Now
Doing: <the step in hand, and who is on it>
Next: <what happens when it ends>

## Notes
- <a fact the next step needs that no other file holds: why, a path, a trap found mid-task>

## Sub-tasks
| # | Sub-task | Agent | Status | Failed rounds |
| --- | --- | --- | --- | --- |
| 1 | <…> | developer | todo | 0 |

Status: todo · in-progress · auditing · done · blocked

### 1. <sub-task>
Done when: <the state that ends this sub-task>
- AC1: <criterion> — auto: `<command>`
- AC2: <criterion> — inspect
- AC3: <criterion> — visual: <screen / page, screen sizes>
- AC4: <criterion> — human: <what only the user can judge>
- Must not appear: <concrete patterns, for UI work>
- Reports: <paths as they appear>

## Decision log
| # | Decision | Why | From |
| --- | --- | --- | --- |
| 1 | <…> | <…> | user / assumption of <agent> confirmed |

## Handover
<filled at the end: acceptance report, NEEDS-HUMAN items>
```
