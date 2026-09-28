# .crewsade/plan.md template

```markdown
# Mission: <one line>
Status: planning | approved | in-progress | done | aborted
Started: <date>

## Requirement
<the user's words, or the ticket keys / URLs / paths>

## Sub-tasks
| # | Sub-task | Agent | Status | Failed rounds |
| --- | --- | --- | --- | --- |
| 1 | <…> | developer | todo | 0 |

Status: todo · in-progress · auditing · done · blocked

### 1. <sub-task>
- AC1: <criterion> — auto: `<command>`
- AC2: <criterion> — inspect
- AC3: <criterion> — human
- Reports: <paths as they appear>

## Decision log
| # | Decision | Why | From |
| --- | --- | --- | --- |
| 1 | <…> | <…> | user / assumption of <agent> confirmed |

## Handover
<filled at the end: acceptance report, NEEDS-HUMAN items>
```
