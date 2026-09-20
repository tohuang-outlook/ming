import { describe, it, expect } from "vitest";
import { calculateChenggu, formatWeight } from "@/lib/chenggu";
import { resolveBirth } from "@/lib/calendar";
import { calculateBazi } from "@/lib/bazi";
import { profile } from "./helpers";

describe("traditional Chenggu weights", () => {
  it("published example: 庚午五月初八午時 = 9 + 5 + 16 + 10", () => {
    const time = resolveBirth(profile("1990-05-08", "12:00", { calendarType: "Lunar" })).meta.calculationTime;
    const result = calculateChenggu(time);
    expect(result.parts.map(p => p.qian)).toEqual([9,5,16,10]);
    expect(result.weight).toBe("四兩整");
  });
  it("known Gregorian birthday 庚辰七月十七寅時", () => {
    const result = calculateChenggu("2000-08-16 03:00:00");
    expect(result.parts.map(p => p.qian)).toEqual([12,9,9,7]);
    expect(result.totalQian).toBe(37);
  });
  it("uses lunar New Year, not Li Chun", () => {
    expect(calculateBazi(profile("2024-02-05", "12:00")).pillars[0].ganZhi).toBe("甲辰");
    expect(calculateChenggu("2024-02-05 12:00:00").parts[0]).toMatchObject({ basis: "癸卯年", qian: 12 });
  });
  it("23:00 rolls entire lunar date across New Year", () => {
    expect(calculateChenggu("2024-02-09 22:59:00")).toMatchObject({ lunarYear: 2023, month: 12, day: 30, shifted: false });
    expect(calculateChenggu("2024-02-09 23:00:00")).toMatchObject({ lunarYear: 2024, month: 1, day: 1, shifted: true });
    expect(calculateChenggu("2024-02-09 23:00:00").totalQian).toBe(35);
    expect(calculateChenggu("2024-02-10 00:00:00").totalQian).toBe(35);
  });
  it("leap month 15/16 split changes month weight without subtracting days", () => {
    expect(calculateChenggu("2023-04-05 12:00:00")).toMatchObject({ leap: true, effectiveMonth: 2, day: 15, totalQian: 39 });
    expect(calculateChenggu("2023-04-06 12:00:00")).toMatchObject({ leap: true, effectiveMonth: 3, day: 16, totalQian: 48 });
  });
  it("uses already resolved timezone consistently", () => {
    const local = resolveBirth(profile("2024-02-09", "07:00", { timezone: "America/Los_Angeles" }));
    expect(calculateChenggu(local.meta.calculationTime)).toEqual(calculateChenggu("2024-02-09 23:00:00"));
  });
  it("all twelve double-hour weights and exact boundaries", () => {
    expect(Array.from({ length: 12 }, (_, i) => calculateChenggu(`2000-08-16 ${String(i * 2).padStart(2, "0")}:00:00`).parts[3].qian)).toEqual([16,6,7,10,9,16,10,8,8,9,6,6]);
    expect(calculateChenggu("2000-08-16 00:59:00").parts[3].qian).toBe(16);
    expect(calculateChenggu("2000-08-16 01:00:00").parts[3].qian).toBe(6);
  });
  it("rejects impossible dates", () => expect(() => calculateChenggu("2023-02-29 12:00:00")).toThrow());
  it("formats qian without fractional arithmetic", () => {
    expect(formatWeight(6)).toBe("六錢"); expect(formatWeight(12)).toBe("一兩二錢");
    expect(formatWeight(40)).toBe("四兩整"); expect(() => formatWeight(3.7)).toThrow();
  });
});
