import fs from "node:fs";
import path from "node:path";
import { changedFiles, clearRegistry, collectRoots, emit, lintable, parsePayload, readStdin, runTool } from "./hook-lib.mjs";

function isHookPath(file) {
  const normalized = file.replaceAll("\\", "/");
  return (
    normalized === ".cursor/hooks.json" ||
    normalized === "scripts/agent-hooks.test.mjs" ||
    normalized.startsWith(".cursor/hooks/")
  );
}

// stop: lint, unit tests, and astro check for this turn. One follow-up, then the agent may finish.
// Sweeps payload cwd plus checkouts the per-edit hook registered. Ignores CURSOR_PROJECT_DIR.
process.env.NO_COLOR = "1";
process.env.FORCE_COLOR = "0";

const payload = parsePayload(readStdin());
const status = typeof payload.status === "string" ? payload.status : "completed";
const loops = Number(payload.loop_count ?? 0);
if (status !== "completed" || (Number.isFinite(loops) && loops !== 0)) process.exit(0);

const located = collectRoots(payload);
if (located.missingGit) {
  emit("followup_message", `git is not installed; nothing at ${located.cwd} was checked.`);
  process.exit(0);
}
if (located.roots.length === 0) {
  process.stderr.write(`end-of-turn.mjs: no git checkout at ${located.cwd}, nothing checked.\n`);
  process.exit(0);
}

let report = "";
let anyChanged = false;
for (const root of located.roots) {
  const changed = changedFiles(root);
  if (changed.missingGit) {
    report += `\ngit is not installed; ${root} was not checked.\n`;
    anyChanged = true;
    continue;
  }
  if (changed.files.length === 0) continue;
  anyChanged = true;

  const lintFiles = changed.files
    .filter((file) => lintable(file))
    .map((file) => path.join(root, file))
    .filter((file) => fs.existsSync(file));
  if (lintFiles.length > 0) {
    const lint = runTool(root, "eslint", ["--quiet", ...lintFiles], 25_000);
    if (lint.missing || lint.code !== 0) {
      report += `\nESLint errors in changed files (${root}):\n${lint.output}\n`;
    }
  }

  // Product tests finish in ~12s. The hook proof is ~45s, so it runs only when hook files changed.
  const tests = runTool(root, "vitest", ["run", "src"], 30_000);
  if (tests.missing || tests.code !== 0) {
    report += `\nUnit tests fail (${root}):\n${tests.output}\n`;
  }
  if (changed.files.some((file) => isHookPath(file))) {
    const hookTests = runTool(root, "vitest", ["run", "scripts/agent-hooks.test.mjs"], 70_000);
    if (hookTests.missing || hookTests.code !== 0) {
      report += `\nHook tests fail (${root}):\n${hookTests.output}\n`;
    }
  }

  const types = runTool(root, "astro", ["check"], 60_000);
  if (types.missing || types.code !== 0) {
    report += `\nastro check fails (${root}):\n${types.output}\n`;
  }
}

if (!anyChanged) {
  clearRegistry(payload);
  process.exit(0);
}
if (report) {
  emit("followup_message", `Fix these before you finish:${report}`);
  process.exit(0);
}
clearRegistry(payload);
process.exit(0);
