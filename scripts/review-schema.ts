import { z } from "zod";

// Jedno kryterium: ocena i uzasadnienie. Score to zwykłe z.number(): structured output
// Anthropica odrzuca minimum/maximum na typie integer, więc zakres 1-10 wymuszamy
// opisem pola i promptem, a nie samym schematem.
export const ReviewCriterion = z.object({
  score: z.number().describe("Integer score from 1 (worst) to 10 (best)."),
  rationale: z.string().describe("Why this score was given; concrete enough to explain a low score."),
});
export type ReviewCriterion = z.infer<typeof ReviewCriterion>;

// Sześć kryteriów, każde z rubryką 1/10 w opisie
export const ReviewCriteria = z.object({
  implementationCorrectness: ReviewCriterion.describe(
    "Does the code do what it claims, handling edge cases and error paths without regressions? " +
      "1: logic broken, misses obvious edge/error cases, or silently regresses. " +
      "10: correct across happy path, edge cases, and failure modes with no regressions."
  ),
  // ... idiomaticity, complexity, testRiskCoverage, documentation
  securitySafety: ReviewCriterion.describe(
    "Does the change avoid vulnerabilities, leaking secrets, or unsafe handling of untrusted input? " +
      "1: introduces an exploitable flaw, leaks secrets, or trusts untrusted input unsafely. " +
      "10: input validated, secrets handled correctly, no new attack surface opened."
  ),
});
export type ReviewCriteria = z.infer<typeof ReviewCriteria>;

// Pełny wynik review: kryteria, werdykt i podsumowanie
export const ReviewResult = z.object({
  criteria: ReviewCriteria,
  verdict: z.enum(["pass", "fail"]).describe("Authoritative overall verdict for the change."),
  summary: z.string().describe("Markdown summary for a PR comment."),
});
export type ReviewResult = z.infer<typeof ReviewResult>;

// Konfiguracja pola target zapewnia zgodność między zodem a Claude Agent SDK
export const REVIEW_JSON_SCHEMA = JSON.stringify(z.toJSONSchema(ReviewResult, { target: "draft-07" }), null, 2);

// Prompt powtarza kontrakt, którego schemat nie wymusza: liczby całkowite od 1 do 10
export const REVIEWER_PROMPT = `You are a rigorous code reviewer. Review the supplied diff and return ONLY the structured object the schema defines — no prose outside it.

Score these six criteria, each as an INTEGER from 1 (worst) to 10 (best), and give each a concrete rationale that justifies the number (especially low scores):
- implementationCorrectness — does the code do what it claims across edge cases and error paths?
- idiomaticity — does it follow language, framework, and repo conventions?
- complexity — is it as simple as the problem allows, free of needless abstraction?
- testRiskCoverage — are risky paths tested in proportion to their risk?
- documentation — are non-obvious decisions and public surfaces explained?
- securitySafety — does it avoid vulnerabilities, secret leaks, and unsafe handling of untrusted input?

Then emit a single authoritative \`verdict\` ("pass" or "fail") and a \`summary\` written as markdown suitable for posting as a PR comment (lead with the verdict, then the most important findings).
Do it according to the JSON schema:
${REVIEW_JSON_SCHEMA}`;

