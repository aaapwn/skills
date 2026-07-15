# LMP Skills

Source of truth for 6 custom Jira/QA workflow skills. Each `<skill>/SKILL.md`
is a **template**: machine-specific paths are written as `{{VAULT_ROOT}}` and
`{{PLAYWRIGHT_WORKSPACE}}` instead of being hard-coded, so the same source
works on any machine.

- `{{VAULT_ROOT}}` — root of the Obsidian vault that holds `tickets/{TASK-ID}/...`
- `{{PLAYWRIGHT_WORKSPACE}}` — personal Playwright test workspace used by `jira-testing`

## Installing

No clone needed — run straight from the GitHub repo:

```bash
npx github:<GITHUB_ORG>/<REPO>
```

(Once this folder is pushed, replace `<GITHUB_ORG>/<REPO>` with the real path, e.g. `npx github:lmwn/lmp-jira-skills`.)

Or, if you already have this folder locally:

```bash
node install.js
```

Either way, the wizard asks:
1. Which skills to install (default: all 6)
2. What `{{VAULT_ROOT}}` and `{{PLAYWRIGHT_WORKSPACE}}` resolve to **on this machine**
3. Where to install: Claude Code (`~/.claude/skills` and/or a project's `.claude/skills`) and/or Cursor (`~/.cursor/skills` and/or a project's `.cursor/skills`) — any combination

It renders each template with the real paths and writes the result to every
selected location. Claude Code and Cursor both use the same `SKILL.md`
format (frontmatter `name` + `description`, `disable-model-invocation: true`
for manual-only skills), so one install produces byte-identical files for
both tools.

## Editing a skill

Always edit the template here (`<skill>/SKILL.md`, with `{{...}}` placeholders
intact), never the installed copy under `~/.claude/skills` or
`~/.cursor/skills` — those get overwritten next time `install.js` runs. After
editing, re-run `node install.js`.

## Sharing with teammates

Point them at `npx github:<GITHUB_ORG>/<REPO>` — no clone, no local checkout.
They answer the prompts with their own paths; nothing in the template
assumes a specific username or folder layout.
