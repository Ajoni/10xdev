import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "hook",
      GIT_AUTHOR_EMAIL: "hook@example.com",
      GIT_COMMITTER_NAME: "hook",
      GIT_COMMITTER_EMAIL: "hook@example.com",
    },
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} (${cwd}): ${result.stderr || result.stdout}`);
  }
}

function copyHooks(repo) {
  const dest = path.join(repo, ".cursor", "hooks");
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ["hook-lib.mjs", "lint-edited-file.mjs", "end-of-turn.mjs"]) {
    fs.copyFileSync(path.join(root, ".cursor", "hooks", name), path.join(dest, name));
  }
  fs.copyFileSync(path.join(root, ".cursor", "hooks.json"), path.join(repo, ".cursor", "hooks.json"));
}

function writeStubs(repo) {
  const eslintBin = path.join(repo, "node_modules", "eslint", "bin");
  const astroBin = path.join(repo, "node_modules", "astro", "bin");
  const vitestBin = path.join(repo, "node_modules", "vitest");
  fs.mkdirSync(eslintBin, { recursive: true });
  fs.mkdirSync(astroBin, { recursive: true });
  fs.mkdirSync(vitestBin, { recursive: true });
  fs.writeFileSync(path.join(eslintBin, "eslint.js"), eslintStub());
  fs.writeFileSync(path.join(astroBin, "astro.mjs"), astroStub());
  fs.writeFileSync(path.join(vitestBin, "vitest.mjs"), vitestStub());
}

function eslintStub() {
  return [
    'const fs = require("node:fs");',
    'const files = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));',
    'if (process.env.HOOK_STUB_LOG) fs.appendFileSync(process.env.HOOK_STUB_LOG, "eslint\\n");',
    "let failed = false;",
    "for (const file of files) {",
    "  if (!fs.existsSync(file)) continue;",
    '  const text = fs.readFileSync(file, "utf8");',
    '  if (text.includes("hook-lint-error")) {',
    '    console.log(file + ": hook-lint-error unused marker");',
    "    failed = true;",
    "  }",
    "}",
    "process.exit(failed ? 1 : 0);",
    "",
  ].join("\n");
}

function walkStub(name, marker, line) {
  return [
    'import fs from "node:fs";',
    'import path from "node:path";',
    'if (process.env.HOOK_STUB_LOG) fs.appendFileSync(process.env.HOOK_STUB_LOG, "' +
      name +
      ' " + process.argv.slice(2).join(" ") + "\\n");',
    'const skip = new Set(["node_modules", ".git", ".cursor"]);',
    "function walk(dir, found) {",
    "  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {",
    "    if (skip.has(entry.name)) continue;",
    "    const full = path.join(dir, entry.name);",
    "    if (entry.isDirectory()) walk(full, found);",
    "    else if (entry.isFile()) found.push(full);",
    "  }",
    "}",
    "const files = [];",
    "walk(process.cwd(), files);",
    "let failed = false;",
    "for (const file of files) {",
    '  const text = fs.readFileSync(file, "utf8");',
    `  if (text.includes("${marker}")) {`,
    `    console.error(file);`,
    `    console.error(${JSON.stringify(line)});`,
    "    failed = true;",
    "  }",
    "}",
    "process.exit(failed ? 1 : 0);",
    "",
  ].join("\n");
}

function astroStub() {
  return walkStub("astro", "hook-type-error", "astro check: type error");
}

function vitestStub() {
  return walkStub("vitest", "hook-assert-fail", "AssertionError: expected next action to be the sooner deadline");
}

function initRepo(dir) {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "core.autocrlf", "false"]);
  copyHooks(dir);
  writeStubs(dir);
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "ok.ts"), "export const value = 1;\n");
  fs.writeFileSync(path.join(dir, "README.md"), "hello\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "init"]);
}

function makeFixture() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-hooks-"));
  try {
    const repo = path.join(parent, "repo");
    initRepo(repo);
    return { parent, repo, log: path.join(parent, "stub.log"), worktree: "" };
  } catch (error) {
    fs.rmSync(parent, { recursive: true, force: true });
    throw error;
  }
}

function cleanup(ctx) {
  if (ctx.worktree) {
    spawnSync("git", ["worktree", "remove", "--force", ctx.worktree], { cwd: ctx.repo, windowsHide: true });
  }
  fs.rmSync(ctx.parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

function check(name, fn) {
  it(
    name,
    () => {
      const ctx = makeFixture();
      try {
        fn(ctx);
      } finally {
        cleanup(ctx);
      }
    },
    20000,
  );
}

function write(repo, rel, text) {
  const full = path.join(repo, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

function run(repo, script, payload, env = {}) {
  const input = Buffer.isBuffer(payload) || typeof payload === "string" ? payload : JSON.stringify(payload);
  return spawnSync(process.execPath, [path.join(repo, ".cursor", "hooks", script)], {
    cwd: repo,
    input,
    encoding: "utf8",
    windowsHide: true,
    timeout: 20000,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env },
  });
}

function runCommand(cwd, command, payload, env) {
  const [exe, ...args] = command.split(" ");
  return spawnSync(exe === "node" ? process.execPath : exe, args, {
    cwd,
    input: JSON.stringify(payload),
    encoding: "utf8",
    windowsHide: true,
    timeout: 20000,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env },
  });
}

function message(result, name) {
  expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
  const text = (result.stdout || "").trim();
  if (!text) return "";
  const parsed = JSON.parse(text);
  const value = parsed[name];
  return typeof value === "string" ? value : "";
}

function logOf(ctx) {
  return fs.existsSync(ctx.log) ? fs.readFileSync(ctx.log, "utf8") : "";
}

function envOf(ctx, extra = {}) {
  return { HOOK_STUB_LOG: ctx.log, ...extra };
}

function stopPayload(cwd, extra = {}) {
  return { status: "completed", loop_count: 0, cwd, conversation_id: randomUUID(), ...extra };
}

describe("per edit", () => {
  check("broken file returns additional_context", (ctx) => {
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const result = run(
      ctx.repo,
      "lint-edited-file.mjs",
      {
        tool_name: "Write",
        tool_input: { file_path: path.join(ctx.repo, "src", "bad.ts") },
        cwd: ctx.repo,
        conversation_id: randomUUID(),
      },
      envOf(ctx),
    );
    const text = message(result, "additional_context");
    expect(text).toContain("bad.ts");
    expect(text).toContain("hook-lint-error");
    expect(logOf(ctx)).toBe("eslint\n");
  });

  check("path, target_file, and string tool_input name the file", (ctx) => {
    const file = path.join(ctx.repo, "src", "bad.ts");
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const inputs = [{ path: file }, { target_file: file }, JSON.stringify({ filePath: file })];
    for (const toolInput of inputs) {
      fs.rmSync(ctx.log, { force: true });
      const result = run(
        ctx.repo,
        "lint-edited-file.mjs",
        { tool_name: "Write", tool_input: toolInput, cwd: ctx.repo, conversation_id: randomUUID() },
        envOf(ctx),
      );
      expect(message(result, "additional_context")).toContain("bad.ts");
    }
  });

  check("clean file is silent", (ctx) => {
    const result = run(
      ctx.repo,
      "lint-edited-file.mjs",
      {
        tool_name: "Write",
        tool_input: { path: path.join(ctx.repo, "src", "ok.ts") },
        cwd: ctx.repo,
        conversation_id: randomUUID(),
      },
      envOf(ctx),
    );
    expect(message(result, "additional_context")).toBe("");
    expect(logOf(ctx)).toBe("eslint\n");
  });

  check("skipped, missing, empty, and pathless payloads are silent", (ctx) => {
    const payloads = [
      { tool_name: "Write", tool_input: { file_path: path.join(ctx.repo, "README.md") }, cwd: ctx.repo },
      { tool_name: "Write", tool_input: { file_path: path.join(ctx.repo, "src", "missing.ts") }, cwd: ctx.repo },
      {},
      "not json",
      { tool_name: "Write", tool_input: { contents: "x" }, cwd: ctx.repo },
    ];
    for (const payload of payloads) {
      const result = run(ctx.repo, "lint-edited-file.mjs", payload, envOf(ctx));
      expect(message(result, "additional_context")).toBe("");
    }
    expect(logOf(ctx)).toBe("");
  });

  check("utf-16 payload still lints", (ctx) => {
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const payload = Buffer.from(
      JSON.stringify({
        tool_name: "Write",
        tool_input: { path: path.join(ctx.repo, "src", "bad.ts") },
        cwd: ctx.repo,
        conversation_id: randomUUID(),
      }),
      "utf16le",
    );
    const result = run(ctx.repo, "lint-edited-file.mjs", payload, envOf(ctx));
    expect(message(result, "additional_context")).toContain("bad.ts");
  });

  check("missing eslint is a failure signal", (ctx) => {
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    fs.rmSync(path.join(ctx.repo, "node_modules", "eslint", "bin", "eslint.js"));
    const result = run(
      ctx.repo,
      "lint-edited-file.mjs",
      {
        tool_name: "Write",
        tool_input: { path: path.join(ctx.repo, "src", "bad.ts") },
        cwd: ctx.repo,
        conversation_id: randomUUID(),
      },
      envOf(ctx),
    );
    const text = message(result, "additional_context");
    expect(text).toContain("not installed");
    expect(text).toContain("did not run");
  });
});

describe("end of turn", () => {
  check("retry flag lets a broken tree finish", (ctx) => {
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo, { loop_count: 1 }), envOf(ctx));
    expect(message(result, "followup_message")).toBe("");
    expect(logOf(ctx)).toBe("");
  });

  check("aborted status does not check", (ctx) => {
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo, { status: "aborted" }), envOf(ctx));
    expect(message(result, "followup_message")).toBe("");
    expect(logOf(ctx)).toBe("");
  });

  check("no changed files does not run checks", (ctx) => {
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    expect(message(result, "followup_message")).toBe("");
    expect(logOf(ctx)).toBe("");
  });

  check("clean change stays silent after checks run", (ctx) => {
    write(ctx.repo, "src/ok.ts", "export const value = 2;\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    expect(message(result, "followup_message")).toBe("");
    expect(logOf(ctx)).toBe("eslint\nvitest run src\nastro check\n");
  });

  check("a hook script change also runs the hook proof", (ctx) => {
    const hook = path.join(ctx.repo, ".cursor", "hooks", "lint-edited-file.mjs");
    fs.appendFileSync(hook, "\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    expect(message(result, "followup_message")).toBe("");
    expect(logOf(ctx)).toContain("vitest run src\n");
    expect(logOf(ctx)).toContain("vitest run scripts/agent-hooks.test.mjs\n");
  });

  check("a lint error written on disk is named", (ctx) => {
    write(ctx.repo, "src/sneaky.ts", "export const unused = 1;\n// hook-lint-error\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    const text = message(result, "followup_message");
    expect(text).toContain("sneaky.ts");
    expect(text).toContain("hook-lint-error");
  });

  check("a failing assertion is named", (ctx) => {
    write(ctx.repo, "src/order.test.ts", "export const name = 'order';\n// hook-assert-fail\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    const text = message(result, "followup_message");
    expect(text).toContain("order.test.ts");
    expect(text).toContain("AssertionError");
    expect(text).toContain("sooner deadline");
  });

  check("a type error is named", (ctx) => {
    write(ctx.repo, "src/clock.ts", "export const clock = '2026-10-14T23:30';\n// hook-type-error\n");
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    const text = message(result, "followup_message");
    expect(text).toContain("clock.ts");
    expect(text).toContain("type error");
  });

  check("missing astro check is a failure signal", (ctx) => {
    write(ctx.repo, "src/ok.ts", "export const value = 2;\n");
    fs.rmSync(path.join(ctx.repo, "node_modules", "astro", "bin", "astro.mjs"));
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    const text = message(result, "followup_message");
    expect(text).toContain("astro");
    expect(text).toContain("not installed");
    expect(text).toContain("did not run");
  });

  check("missing vitest is a failure signal", (ctx) => {
    write(ctx.repo, "src/ok.ts", "export const value = 2;\n");
    fs.rmSync(path.join(ctx.repo, "node_modules", "vitest", "vitest.mjs"));
    const result = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx));
    const text = message(result, "followup_message");
    expect(text).toContain("vitest");
    expect(text).toContain("not installed");
    expect(text).toContain("did not run");
  });

  check("no git checkout reports on stderr and does not follow up", (ctx) => {
    const bare = path.join(ctx.parent, "bare");
    fs.mkdirSync(bare);
    const result = spawnSync(process.execPath, [path.join(ctx.repo, ".cursor", "hooks", "end-of-turn.mjs")], {
      cwd: bare,
      input: JSON.stringify({ status: "completed", loop_count: 0, cwd: bare }),
      encoding: "utf8",
      windowsHide: true,
      timeout: 20000,
    });
    expect(message(result, "followup_message")).toBe("");
    expect(result.stderr).toContain("nothing checked");
  });
});

describe("checkout resolution", () => {
  check("relative path resolves against cwd, not CURSOR_PROJECT_DIR", (ctx) => {
    write(ctx.repo, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const result = run(
      ctx.repo,
      "lint-edited-file.mjs",
      { tool_input: { file_path: "src/bad.ts" }, cwd: ctx.repo, conversation_id: randomUUID() },
      envOf(ctx, { CURSOR_PROJECT_DIR: path.join(ctx.parent, "missing-project-dir") }),
    );
    const text = message(result, "additional_context");
    expect(text).toContain(path.normalize(path.join(ctx.repo, "src", "bad.ts")));
    expect(text).toContain("hook-lint-error");
  });

  check("another repository is skipped", (ctx) => {
    const other = path.join(ctx.parent, "other");
    initRepo(other);
    write(other, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const result = run(
      ctx.repo,
      "lint-edited-file.mjs",
      {
        tool_input: { file_path: path.join(other, "src", "bad.ts") },
        cwd: ctx.repo,
        conversation_id: randomUUID(),
      },
      envOf(ctx),
    );
    expect(message(result, "additional_context")).toBe("");
    expect(logOf(ctx)).toBe("");
  });

  check("CURSOR_PROJECT_DIR with an error stays green", (ctx) => {
    const other = path.join(ctx.parent, "other");
    initRepo(other);
    write(other, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const edited = run(
      ctx.repo,
      "lint-edited-file.mjs",
      {
        tool_input: { path: path.join(ctx.repo, "src", "ok.ts") },
        cwd: ctx.repo,
        conversation_id: randomUUID(),
      },
      envOf(ctx, { CURSOR_PROJECT_DIR: other }),
    );
    expect(message(edited, "additional_context")).toBe("");
    fs.rmSync(ctx.log, { force: true });
    const stopped = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo), envOf(ctx, { CURSOR_PROJECT_DIR: other }));
    expect(message(stopped, "followup_message")).toBe("");
    expect(logOf(ctx)).toBe("");
  });

  check("a sibling worktree edit is swept", (ctx) => {
    const wt = path.join(ctx.parent, "wt");
    git(ctx.repo, ["worktree", "add", "--detach", wt]);
    ctx.worktree = wt;
    const id = randomUUID();
    const registered = run(
      ctx.repo,
      "lint-edited-file.mjs",
      { tool_input: { path: path.join(wt, "src", "ok.ts") }, cwd: ctx.repo, conversation_id: id },
      envOf(ctx),
    );
    expect(message(registered, "additional_context")).toBe("");
    fs.rmSync(ctx.log, { force: true });
    write(wt, "src/sneaky.ts", "export const unused = 1;\n// hook-lint-error\n");
    const stopped = run(ctx.repo, "end-of-turn.mjs", stopPayload(ctx.repo, { conversation_id: id }), envOf(ctx));
    const text = message(stopped, "followup_message");
    expect(text).toContain("sneaky.ts");
    expect(text).toContain("hook-lint-error");
  });

  check("config commands run from a worktree when CURSOR_PROJECT_DIR is missing", (ctx) => {
    const config = JSON.parse(fs.readFileSync(path.join(root, ".cursor", "hooks.json"), "utf8"));
    expect(config.version).toBe(1);
    expect(config.hooks.postToolUse[0].command).toBe("node .cursor/hooks/lint-edited-file.mjs");
    expect(config.hooks.postToolUse[0].matcher).toContain("Write");
    expect(config.hooks.postToolUse[0].timeout).toBe(30);
    expect(config.hooks.stop[0].command).toBe("node .cursor/hooks/end-of-turn.mjs");
    expect(config.hooks.stop[0].timeout).toBe(180);
    expect(config.hooks.stop[0].loop_limit).toBe(1);

    const wt = path.join(ctx.parent, "wt");
    git(ctx.repo, ["worktree", "add", "--detach", wt]);
    ctx.worktree = wt;
    write(wt, "src/bad.ts", "export const unused = 1;\n// hook-lint-error\n");
    const missing = path.join(ctx.parent, "missing-project-dir");
    const payload = {
      tool_name: "Write",
      tool_input: { path: path.join(wt, "src", "bad.ts") },
      cwd: wt,
      status: "completed",
      loop_count: 0,
      conversation_id: randomUUID(),
    };
    for (const command of [config.hooks.postToolUse[0].command, config.hooks.stop[0].command]) {
      fs.rmSync(ctx.log, { force: true });
      const result = runCommand(wt, command, payload, envOf(ctx, { CURSOR_PROJECT_DIR: missing }));
      const field = command.includes("end-of-turn") ? "followup_message" : "additional_context";
      expect(message(result, field)).toContain("bad.ts");
      expect(logOf(ctx)).toContain("eslint");
    }
  });
});
