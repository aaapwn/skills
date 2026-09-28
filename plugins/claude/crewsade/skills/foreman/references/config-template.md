# .crewsade/config.md template

```markdown
# Crewsade config

## Stack
<languages, frameworks, package manager, runtime versions>

## Commands
| Purpose | Command | Verified |
| --- | --- | --- |
| test | <cmd> | yes / no: <why> |
| lint | <cmd> | yes / no |
| build | <cmd> | yes / no |
| typecheck | <cmd> | yes / no |

## Definition of Done
Applies to every sub-task.
- [ ] full test suite passes
- [ ] lint passes
- [ ] build passes
- [ ] no new warnings
- <anything else the user adds>

## Do not touch
- <paths: generated code, vendored code, migrations already applied, …>

## Commit policy
per-subtask | none
<per-subtask: the foreman commits after each PASS, staging explicit paths.>

## Conventions
<commit message format, branch naming, anything from CLAUDE.md / CONTRIBUTING the crew must follow>
```

A command marked `no` in *Verified* is not part of the DoD until someone makes it run.
