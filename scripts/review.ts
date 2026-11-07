import { Agent, CursorAgentError } from "@cursor/sdk";
import { z } from "zod";
const ReviewResult = z.object({
  criteria: z.object({
    implementationCorrectness: z.object({ score: z.number(), rationale: z.string() }),
    idiomaticity: z.object({ score: z.number(), rationale: z.string() }),
    complexity: z.object({ score: z.number(), rationale: z.string() }),
    testRiskCoverage: z.object({ score: z.number(), rationale: z.string() }),
    documentation: z.object({ score: z.number(), rationale: z.string() }),
    securitySafety: z.object({ score: z.number(), rationale: z.string() }),
  }),
  verdict: z.enum(["pass", "fail"]),
  summary: z.string(),
});
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
    `Zrecenzuj ten diff. Zwróć wyłącznie JSON zgodny ze schematem: sześć kryteriów (score 1-10 i rationale), verdict "pass" albo "fail", summary w markdownu.\n\n${diff}`,
    {
      apiKey,
      model: { id: "composer-2.5" },
      tools: [],
      local: { cwd: process.cwd() },
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
