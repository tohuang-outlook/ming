import { describe, it, expect } from "vitest";
import {
  gregorianToLunar,
  lunarToGregorian,
  resolveBirth,
  doubleHour,
  solarTerms,
  SEXAGENARY_CYCLE,
} from "@/lib/calendar";
import { profile } from "./helpers";
describe("Phase A calendar", () => {
  it("Gregorian leap day round trips", () => {
    const l = gregorianToLunar("2024-02-29");
    expect(lunarToGregorian(l.year, l.month, l.day, l.isLeapMonth)).toBe(
      "2024-02-29",
    );
  });
  it.each(["2023-02-29", "1900-02-29", "2024-04-31"])(
    "rejects invalid date %s",
    (d) => expect(() => gregorianToLunar(d)).toThrow(),
  );
  it("2024 Lunar New Year (HKO calendar)", () =>
    expect(gregorianToLunar("2024-02-10")).toMatchObject({
      year: 2024,
      month: 1,
      day: 1,
      isLeapMonth: false,
    }));
  it("2023 leap second month (HKO calendar)", () =>
    expect(lunarToGregorian(2023, 2, 1, true)).toBe("2023-03-22"));
  it("rejects nonexistent leap month", () =>
    expect(() => lunarToGregorian(2024, 2, 1, true)).toThrow());
  it("60 distinct sexagenary pairs", () => {
    expect(new Set(SEXAGENARY_CYCLE).size).toBe(60);
    expect(SEXAGENARY_CYCLE[59]).toBe("癸亥");
  });
  it.each([
    [23, "子"],
    [0, "子"],
    [1, "丑"],
    [22, "亥"],
  ])("double hour %i", (h, b) =>
    expect(doubleHour(h as number).branch).toBe(b),
  );
  it("same instant produces same calculation time", () =>
    expect(
      resolveBirth(profile("2005-12-23", "00:37", { timezone: "UTC" })).meta
        .calculationTime,
    ).toBe(resolveBirth(profile()).meta.calculationTime));
  it("timezone crosses year and day", () =>
    expect(
      resolveBirth(
        profile("2024-12-31", "23:30", { timezone: "America/Los_Angeles" }),
      ).meta.calculationTime,
    ).toBe("2025-01-01 15:30:00"));
  it.each(["2024-03-10T02:30", "2024-11-03T01:30"])(
    "rejects DST ambiguity %s",
    (v) =>
      expect(() =>
        resolveBirth(
          profile(v.slice(0, 10), v.slice(11), {
            timezone: "America/Los_Angeles",
          }),
        ),
      ).toThrow(),
  );
  it("unknown timezone rejected", () =>
    expect(() =>
      resolveBirth(profile("2005-12-23", "08:37", { timezone: "not-a-zone" })),
    ).toThrow());
  it("missing birth time rejected", () =>
    expect(() => resolveBirth(profile("2005-12-23", ""))).toThrow());
  it("24 exact solar terms and upstream Bai Lu fixture", () => {
    const terms = solarTerms(2012);
    expect(terms).toHaveLength(24);
    expect(terms.find((x) => x.name === "白露")?.dateTime).toBe(
      "2012-09-07 13:29:01",
    );
  });
  it("lunar input shares Gregorian engine", () =>
    expect(
      resolveBirth(profile("2024-01-01", "12:00", { calendarType: "Lunar" }))
        .meta.localDate,
    ).toBe("2024-02-10"));
  it("day boundary never follows machine timezone", () =>
    expect(
      resolveBirth(profile("2024-02-10", "00:00")).meta.calculationTime,
    ).toBe("2024-02-10 00:00:00"));
  it("lunar month boundary", () => {
    expect(gregorianToLunar("2023-03-21").isLeapMonth).toBe(false);
    expect(gregorianToLunar("2023-03-22").isLeapMonth).toBe(true);
  });
});
