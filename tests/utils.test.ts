import { describe, it, expect } from "vitest";
import {
  cn,
  fmtMoney,
  fmtSignedMoney,
  fmtNumber,
  pct,
  clamp,
  timeAgo,
  fmtDate,
  dayKey,
  daysAgo,
  addDays,
  startOfMonth,
  startOfDay,
  jsonParse,
  jsonStringify,
  mulberry32,
  pick,
  pickWeighted,
  initials,
  colorFor,
  hashCode,
} from "@/lib/utils";

describe("utils — money", () => {
  it("formats currency with locale grouping", () => {
    expect(fmtMoney(1234.5)).toBe("$1,235");
    expect(fmtMoney(42.5)).toBe("$42.50");
    expect(fmtMoney(0)).toBe("$0.00");
  });

  it("supports compact notation", () => {
    expect(fmtMoney(1_250_000, { compact: true })).toBe("$1.3M");
    expect(fmtMoney(250_000, { compact: true })).toBe("$250K");
    expect(fmtMoney(999, { compact: true })).toBe("$999");
  });

  it("handles signed money", () => {
    expect(fmtSignedMoney(500)).toBe("+$500");
    expect(fmtSignedMoney(-250)).toBe("-$250");
  });
});

describe("utils — numbers", () => {
  it("formats numbers and compact", () => {
    expect(fmtNumber(1234567)).toBe("1,234,567");
    expect(fmtNumber(1234567, true)).toBe("1.2M");
    expect(fmtNumber(2500, true)).toBe("2.5K");
  });

  it("formats percents", () => {
    expect(pct(42.5)).toBe("43%");
    expect(pct(42.5, 1)).toBe("42.5%");
  });

  it("clamps to range", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});

describe("utils — time", () => {
  it("renders relative time", () => {
    expect(timeAgo(new Date())).toBe("0s ago");
    expect(timeAgo(new Date(Date.now() - 90_000))).toBe("1m ago");
    expect(timeAgo(new Date(Date.now() - 3_600_000))).toBe("1h ago");
    expect(timeAgo(new Date(Date.now() - 48 * 3_600_000))).toBe("2d ago");
  });

  it("renders dates", () => {
    expect(fmtDate(new Date(2026, 0, 15))).toMatch(/Jan/i);
    expect(dayKey(new Date("2026-08-20T10:00:00Z"))).toBe("2026-08-20");
  });

  it("computes date offsets", () => {
    expect(daysAgo(3).getDate()).toBe(new Date(Date.now() - 3 * 86_400_000).getDate());
    expect(addDays(new Date(2026, 0, 1), 5).getDate()).toBe(6);
    expect(startOfMonth(new Date(2026, 5, 15)).getDate()).toBe(1);
    expect(startOfDay(new Date(2026, 5, 15, 23, 59)).getHours()).toBe(0);
  });
});

describe("utils — json", () => {
  it("parses with fallback", () => {
    expect(jsonParse('{"a":1}', {})).toEqual({ a: 1 });
    expect(jsonParse("not json", { fallback: true })).toEqual({ fallback: true });
    expect(jsonParse(null, [])).toEqual([]);
  });

  it("stringifies", () => {
    expect(jsonStringify({ ok: true })).toBe('{"ok":true}');
  });
});

describe("utils — rng", () => {
  it("is deterministic per seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("picks within bounds", () => {
    const rng = mulberry32(7);
    const arr = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) expect(arr).toContain(pick(rng, arr));
    const w = pickWeighted(rng, arr, [100, 1, 1]);
    expect(w).toBe("a");
  });
});

describe("utils — identity", () => {
  it("builds initials", () => {
    expect(initials("Rohit Verma")).toBe("RV");
    expect(initials("ada")).toBe("A");
  });

  it("assigns stable colors", () => {
    expect(colorFor("Mercury")).toBe(colorFor("Mercury"));
    expect(hashCode("x")).toBeGreaterThanOrEqual(0);
  });

  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    const falsy = false;
    expect(cn("a", falsy && "b", null, "c")).toBe("a c");
  });
});