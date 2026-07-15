#!/usr/bin/env node
// Wizard to install the LMP skills (this directory's */SKILL.md templates)
// into Claude Code and/or Cursor, on this machine, at whatever paths
// this machine actually uses for the Obsidian vault and Playwright workspace.
//
// Usage: node install.js

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const SKILLS_DIR = __dirname;
const HOME = os.homedir();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Plain rl.question() can silently drop answers when stdin is piped (all
// lines arrive as one buffered chunk and 'line' events can fire before the
// next question() call is listening). Queue lines ourselves instead so no
// answer is ever lost, whether a human is typing or input is piped in.
const lineQueue = [];
const waiters = [];
rl.on("line", (line) => {
  if (waiters.length) waiters.shift()(line);
  else lineQueue.push(line);
});
const ask = (q) => {
  process.stdout.write(q);
  return new Promise((resolve) => {
    if (lineQueue.length) resolve(lineQueue.shift().trim());
    else waiters.push((line) => resolve(line.trim()));
  });
};

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return HOME;
  if (p.startsWith("~/")) return path.join(HOME, p.slice(2));
  return p;
}

function discoverSkills() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(SKILLS_DIR, name, "SKILL.md")))
    .sort();
}

async function askYesNo(question, defaultYes) {
  const suffix = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = (await ask(`${question} ${suffix} `)).toLowerCase();
  if (!answer) return defaultYes;
  return answer.startsWith("y");
}

async function askPath(question, defaultValue) {
  const answer = await ask(`${question} [${defaultValue}] `);
  const resolved = expandHome(answer || defaultValue);
  return path.resolve(resolved);
}

async function main() {
  console.log("=== LMP Skills Installer ===");
  console.log(`Source templates: ${SKILLS_DIR}\n`);

  const allSkills = discoverSkills();
  if (allSkills.length === 0) {
    console.error("No skills found (expected */SKILL.md next to this script).");
    process.exit(1);
  }

  // --- 1. Which skills ---
  console.log(`Found ${allSkills.length} skills: ${allSkills.join(", ")}`);
  const installAll = await askYesNo("Install all of them?", true);
  let selectedSkills = allSkills;
  if (!installAll) {
    const raw = await ask("Enter comma-separated skill names to install: ");
    const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
    selectedSkills = allSkills.filter((s) => wanted.includes(s));
    if (selectedSkills.length === 0) {
      console.error("No valid skill names selected. Aborting.");
      process.exit(1);
    }
  }

  // --- 2. Machine-specific paths ---
  console.log("\n--- Paths on this machine ---");
  const vaultRoot = await askPath(
    "Obsidian vault root (the folder containing tickets/, used by grill/requirement/testing/implementation/change skills)",
    path.join(HOME, "Desktop/LMP/lmp-task-prd")
  );
  const needsPlaywright = selectedSkills.includes("jira-testing");
  let playwrightWorkspace = null;
  if (needsPlaywright) {
    playwrightWorkspace = await askPath(
      "Personal Playwright test workspace root (used by jira-testing)",
      path.join(HOME, "Desktop/LMP/CSS/jera-css-playwright")
    );
  }

  // --- 3. Targets ---
  console.log("\n--- Install targets ---");
  const targets = [];

  const wantClaudeGlobal = await askYesNo("Install for Claude Code, globally (~/.claude/skills)?", true);
  if (wantClaudeGlobal) targets.push({ label: "Claude Code (global)", dir: path.join(HOME, ".claude/skills") });

  const wantCursorGlobal = await askYesNo("Install for Cursor, globally (~/.cursor/skills)?", true);
  if (wantCursorGlobal) targets.push({ label: "Cursor (global)", dir: path.join(HOME, ".cursor/skills") });

  const wantProject = await askYesNo("Also install into a specific project (workspace-local)?", false);
  if (wantProject) {
    const projectDir = await askPath("Project root path", process.cwd());
    const wantClaudeProject = await askYesNo(`  -> Claude Code project skills (${projectDir}/.claude/skills)?`, true);
    if (wantClaudeProject) targets.push({ label: "Claude Code (project)", dir: path.join(projectDir, ".claude/skills") });
    const wantCursorProject = await askYesNo(`  -> Cursor project skills (${projectDir}/.cursor/skills)?`, true);
    if (wantCursorProject) targets.push({ label: "Cursor (project)", dir: path.join(projectDir, ".cursor/skills") });
  }

  if (targets.length === 0) {
    console.error("No install targets selected. Aborting.");
    process.exit(1);
  }

  // --- 4. Render + write ---
  console.log("\n--- Installing ---");
  const vars = { VAULT_ROOT: vaultRoot, PLAYWRIGHT_WORKSPACE: playwrightWorkspace };

  for (const skillName of selectedSkills) {
    const srcFile = path.join(SKILLS_DIR, skillName, "SKILL.md");
    let content = fs.readFileSync(srcFile, "utf8");

    for (const [key, value] of Object.entries(vars)) {
      const token = `{{${key}}}`;
      if (content.includes(token)) {
        if (!value) {
          console.error(`Skill "${skillName}" needs ${key} but none was provided. Skipping this skill.`);
          content = null;
          break;
        }
        content = content.split(token).join(value);
      }
    }
    if (content === null) continue;

    for (const target of targets) {
      const destDir = path.join(target.dir, skillName);
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, "SKILL.md"), content, "utf8");
      console.log(`  [ok] ${skillName} -> ${target.label}: ${destDir}/SKILL.md`);
    }
  }

  console.log("\nDone. Restart Claude Code / Cursor (or start a new session) to pick up the skills.");
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
