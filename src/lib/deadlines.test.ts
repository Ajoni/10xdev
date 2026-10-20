import { describe, expect, it } from "vitest";
import { formatLocalClock, toUtcInstant } from "@/lib/deadlines";

describe("toUtcInstant", () => {
  it("stores 2026-10-14T23:30 as 2026-10-15T06:30:00.000Z", () => {
    expect(toUtcInstant("2026-10-14T23:30")).toBe("2026-10-15T06:30:00.000Z");
  });

  it("stores 2026-10-15T00:30 as 2026-10-15T07:30:00.000Z", () => {
    expect(toUtcInstant("2026-10-15T00:30")).toBe("2026-10-15T07:30:00.000Z");
  });

  it("returns an empty string when the local value is not a date", () => {
    expect(toUtcInstant("not-a-date")).toBe("");
  });
});

describe("formatLocalClock", () => {
  it("shows 2026-10-15T06:30:00.000Z as 2026-10-14 23:30", () => {
    expect(formatLocalClock("2026-10-15T06:30:00.000Z")).toBe("2026-10-14 23:30");
  });

  it("shows 2026-10-15T07:30:00.000Z as 2026-10-15 00:30", () => {
    expect(formatLocalClock("2026-10-15T07:30:00.000Z")).toBe("2026-10-15 00:30");
  });

  it("returns the original string when the instant is not a date", () => {
    expect(formatLocalClock("not-a-date")).toBe("not-a-date");
  });
});
