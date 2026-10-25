import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const LINT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".astro"]);

const TOOL_BINS = {
  eslint: ["eslint", "bin", "eslint.js"],
  astro: ["astro", "bin", "astro.mjs"],
  vitest: ["vitest", "vitest.mjs"],
};

export function readStdin() {
  let buf;
  try {
    buf = fs.readFileSync(0);
  } catch {
    return "";
  }
  return decodeStdin(buf);
}

export function decodeStdin(buf) {
  if (!buf || buf.length === 0) return "";
  let text;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = buf.toString("utf16le").slice(1);
  } else if (looksLikeUtf16Le(buf)) {
    text = buf.toString("utf16le");
  } else {
    text = buf.toString("utf8");
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

function looksLikeUtf16Le(buf) {
  const sample = Math.min(buf.length, 64);
  if (sample < 8) return false;
  let zeros = 0;
  for (let i = 1; i < sample; i += 2) if (buf[i] === 0) zeros += 1;
  return zeros > sample / 4;
}

export function parsePayload(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function payloadCwd(payload) {
  return typeof payload.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();
}

export function editedPath(payload) {
  let input = payload.tool_input ?? payload.toolArgs ?? payload.tool_args;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      return "";
    }
  }
  if (!input || typeof input !== "object") return "";
  const file = input.file_path ?? input.path ?? input.target_file ?? input.filePath ?? input.notebook_path ?? "";
  return typeof file === "string" ? file : "";
}

export function resolveEdited(file, cwd) {
  if (!file) return "";
  return path.normalize(path.isAbsolute(file) ? file : path.resolve(cwd, file));
}

export function lintable(file) {
  return LINT_EXTENSIONS.has(path.extname(file).toLowerCase());
}

export function pathsEqual(left, right) {
  const a = path.normalize(left);
  const b = path.normalize(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function gitRaw(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  if (result.error && result.error.code === "ENOENT") {
    return { missing: true, status: 127, stdout: "" };
  }
  return { missing: false, status: result.status ?? 1, stdout: result.stdout || "" };
}

export function gitTop(cwd) {
  const result = gitRaw(cwd, ["rev-parse", "--show-toplevel"]);
  if (result.missing) return { missing: true, root: "" };
  if (result.status !== 0 || !result.stdout.trim()) return { missing: false, root: "" };
  return { missing: false, root: path.normalize(result.stdout.trim()) };
}

export function gitCommon(cwd) {
  const result = gitRaw(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (result.missing) return { missing: true, dir: "" };
  if (result.status !== 0 || !result.stdout.trim()) return { missing: false, dir: "" };
  return { missing: false, dir: path.normalize(result.stdout.trim()) };
}

export function sameRepoRoot(file, sessionCwd) {
  const top = gitTop(path.dirname(file));
  if (top.missing) return { missingGit: true, root: "" };
  if (!top.root) return { missingGit: false, root: "" };
  const fileRepo = gitCommon(top.root);
  const sessionRepo = gitCommon(sessionCwd);
  if (fileRepo.missing || sessionRepo.missing) return { missingGit: true, root: "" };
  if (!fileRepo.dir || !sessionRepo.dir || !pathsEqual(fileRepo.dir, sessionRepo.dir)) {
    return { missingGit: false, root: "" };
  }
  return { missingGit: false, root: top.root };
}

export function sessionKey(payload) {
  const raw = payload.conversation_id || payload.session_id || "";
  return String(raw).replace(/[^A-Za-z0-9_-]/g, "");
}

function registryPath(payload) {
  const key = sessionKey(payload);
  if (!key) return "";
  return path.join(os.tmpdir(), "cursor-hooks", `${key}.roots`);
}

export function registerRoot(payload, root) {
  const file = registryPath(payload);
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${path.normalize(root)}\n`);
}

export function registeredRoots(payload) {
  const file = registryPath(payload);
  if (!file || !fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function clearRegistry(payload) {
  const file = registryPath(payload);
  if (!file) return;
  fs.rmSync(file, { force: true });
}

export function uniquePaths(list) {
  const out = [];
  for (const item of list) {
    if (!out.some((existing) => pathsEqual(existing, item))) out.push(item);
  }
  return out;
}

export function changedFiles(root) {
  const diff = gitRaw(root, ["diff", "--name-only", "HEAD"]);
  const untracked = gitRaw(root, ["ls-files", "-o", "--exclude-standard"]);
  if (diff.missing || untracked.missing) return { missingGit: true, files: [] };
  const files = uniquePaths(
    `${diff.stdout}\n${untracked.stdout}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
  return { missingGit: false, files };
}

export function runTool(root, name, args, timeout) {
  const relative = TOOL_BINS[name];
  const bin = path.join(root, "node_modules", ...relative);
  if (!fs.existsSync(bin)) {
    return {
      missing: true,
      code: 127,
      output: `${name} is not installed (node_modules/${relative.join("/")} missing). The check did not run.`,
    };
  }
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.error) {
    const detail = result.error.code === "ETIMEDOUT" ? `${name} timed out.` : result.error.message;
    return { missing: false, code: 1, output: `${detail}\n${output}`.trim() };
  }
  return { missing: false, code: result.status ?? 1, output };
}

export function emit(field, message) {
  if (!message) return;
  process.stdout.write(`${JSON.stringify({ [field]: message })}\n`);
}

export function collectRoots(payload) {
  const cwd = payloadCwd(payload);
  const top = gitTop(cwd);
  if (top.missing) return { missingGit: true, cwd, roots: [] };
  const session = top.root ? gitCommon(top.root) : { missing: false, dir: "" };
  if (session.missing) return { missingGit: true, cwd, roots: [] };
  const candidates = [];
  if (top.root) candidates.push(top.root);
  for (const registered of registeredRoots(payload)) {
    if (!fs.existsSync(registered)) continue;
    const registeredTop = gitTop(registered);
    if (registeredTop.missing) return { missingGit: true, cwd, roots: [] };
    if (!registeredTop.root) continue;
    if (session.dir) {
      const common = gitCommon(registeredTop.root);
      if (common.missing) return { missingGit: true, cwd, roots: [] };
      if (!common.dir || !pathsEqual(common.dir, session.dir)) continue;
    }
    candidates.push(registeredTop.root);
  }
  return { missingGit: false, cwd, roots: uniquePaths(candidates) };
}
