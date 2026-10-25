import fs from "node:fs";
import path from "node:path";
import {
  editedPath,
  emit,
  lintable,
  parsePayload,
  payloadCwd,
  readStdin,
  registerRoot,
  resolveEdited,
  runTool,
  sameRepoRoot,
} from "./hook-lib.mjs";

// postToolUse (Write): lint the edited file. Feedback is additional_context on stdout.
// The checkout is the edited file's repo, not CURSOR_PROJECT_DIR.
process.env.NO_COLOR = "1";
process.env.FORCE_COLOR = "0";

const payload = parsePayload(readStdin());
const raw = editedPath(payload);
if (!raw) process.exit(0);

const cwd = payloadCwd(payload);
const file = resolveEdited(raw, cwd);
if (!lintable(file) || !fs.existsSync(file)) process.exit(0);

const located = sameRepoRoot(file, cwd);
if (located.missingGit) {
  emit("additional_context", `git is not installed; ${file} was not checked.`);
  process.exit(0);
}
if (!located.root) process.exit(0);

registerRoot(payload, located.root);
const result = runTool(located.root, "eslint", ["--quiet", file], 25_000);
if (result.missing || result.code !== 0) {
  emit("additional_context", `ESLint reported errors in ${path.normalize(file)}:\n${result.output}`);
}
process.exit(0);
