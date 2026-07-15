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

Interview the user relentlessly about every aspect of this task until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Rules:

- Ask the questions **one at a time**, waiting for the user's answer before continuing. Asking multiple questions at once is bewildering.
- If a *fact* can be found by exploring the codebase, the Jira ticket, or the vault — look it up rather than asking. The *decisions* are the user's — put each one to them and wait.
- Keep a running record of every question asked and the user's answer (you will need it verbatim in Phase 4).
- Do not enact any plan until the user confirms shared understanding has been reached.

## Phase 4: Save the grill transcript

When the grill session is finished (the user confirms shared understanding, or says to wrap up), write the full Q&A transcript to the Obsidian vault:

**Path:** `{vault root}/tickets/{TASK-ID}/grill.md`

Create the `{TASK-ID}` folder if it doesn't exist. If a `grill.md` already exists from a previous session, append the new session under a dated heading instead of overwriting.

**Template** — one block per question, in the order asked:

```
Question 1: {grill question}
Answer: {user answer}

Question 2: {grill question}
Answer: {user answer}
```

Record the user's answers faithfully (their actual decision, not a paraphrase that loses detail). If you gave a recommendation and the user simply accepted it, record the accepted recommendation as the answer.

Finish by telling the user the file was saved and give a one-paragraph summary of the key decisions made.
