import { Agent, CursorAgentError } from "@cursor/sdk";
import { REVIEWER_PROMPT, ReviewResult } from "./review-schema";

async function readDiff(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const diff = Buffer.concat(chunks).toString("utf8").trim();
  if (!diff) throw new Error("Brak diffa na stdin.");
  return diff;
}
const diff = await readDiff();
const apiKey = process.env.CURSOR_API_KEY;
if (apiKey === undefined || apiKey === "") {
  throw new Error("Brak CURSOR_API_KEY.");
}

try {
  const result = await Agent.prompt(
    `${REVIEWER_PROMPT}
    Diff:
    ${diff}`,
    {
      apiKey,
      model: { id: "composer-2.5" },
      tools: [],
    },
  );
  if (result.status === "error") {
    console.error("run failed:", result.id, result.error?.message);
    process.exit(2);
  }
  const raw = result.result ?? "";
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = ReviewResult.safeParse(JSON.parse(json));
  if (!parsed.success) {
    console.error(raw);
    throw new Error(parsed.error.message);
  }
  console.log(JSON.stringify(parsed.data, null, 2));
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("startup failed:", err.message, "retryable=", err.isRetryable);
    process.exit(1);
  }
  throw err;
}
