import { describe, expect, it } from "vitest";
import { guessComplexity } from "@/lib/todos";

describe("guessComplexity", () => {
  it("returns 1 for a trimmed length of 0", () => {
    expect(guessComplexity("a".repeat(0))).toBe(1);
  });

  it("returns 1 for a trimmed length of 19", () => {
    expect(guessComplexity("a".repeat(19))).toBe(1);
  });

  it("returns 2 for a trimmed length of 20", () => {
    expect(guessComplexity("a".repeat(20))).toBe(2);
  });

  it("returns 2 for a trimmed length of 49", () => {
    expect(guessComplexity("a".repeat(49))).toBe(2);
  });

  it("returns 3 for a trimmed length of 50", () => {
    expect(guessComplexity("a".repeat(50))).toBe(3);
  });

  it("returns 3 for a trimmed length of 199", () => {
    expect(guessComplexity("a".repeat(199))).toBe(3);
  });

  it("returns 4 for a trimmed length of 200", () => {
    expect(guessComplexity("a".repeat(200))).toBe(4);
  });

  it("returns 4 for a trimmed length of 999", () => {
    expect(guessComplexity("a".repeat(999))).toBe(4);
  });

  it("returns 5 for a trimmed length of 1000", () => {
    expect(guessComplexity("a".repeat(1000))).toBe(5);
  });

  it("returns 1 for a 19-character description wrapped in spaces", () => {
    expect(guessComplexity(`  ${"a".repeat(19)}  `)).toBe(1);
  });
});
