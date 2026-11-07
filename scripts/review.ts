import { Agent, CursorAgentError } from "@cursor/sdk";
import { z } from "zod";
const Criterion = z.object({
  score: z.number(),
  rationale: z.string(),
});
const ReviewResult = z.object({
  criteria: z.union([
    z.object({
      implementationCorrectness: Criterion,
      idiomaticity: Criterion,
      complexity: Criterion,
      testRiskCoverage: Criterion,
      documentation: Criterion,
      securitySafety: Criterion,
    }),
    z.array(z.object({ id: z.string(), score: z.number(), rationale: z.string() })).min(1),
  ]),
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
    `Zrecenzuj ten diff. Zwróć wyłącznie jeden obiekt JSON, bez markdownu i bez tekstu wokół niego.
Pole criteria ma być obiektem o tych kluczach, nie tablicą. score to liczba całkowita od 1 do 10.
{
  "criteria": {
    "implementationCorrectness": { "score": 1, "rationale": "..." },
    "idiomaticity": { "score": 1, "rationale": "..." },
    "complexity": { "score": 1, "rationale": "..." },
    "testRiskCoverage": { "score": 1, "rationale": "..." },
    "documentation": { "score": 1, "rationale": "..." },
    "securitySafety": { "score": 1, "rationale": "..." }
  },
  "verdict": "pass",
  "summary": "markdown do komentarza w PR"
}

${diff}`,
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
