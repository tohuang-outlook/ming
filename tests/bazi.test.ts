import { it, expect } from "vitest";
import { calculateBazi, baziYear } from "@/lib/bazi";
import { profile } from "./helpers";
import { baziFixtures } from "./fixtures/bazi";
it.each(baziFixtures)("upstream four pillars $date $time", (f) =>
  expect(
    calculateBazi(profile(f.date, f.time)).pillars.map((p) => p.ganZhi),
  ).toEqual(f.expected),
);
it("upstream hidden stems, ten gods, Na Yin, stages", () => {
  const c = calculateBazi(profile());
  expect(c.pillars.map((p) => p.hiddenStems)).toEqual([
    ["辛"],
    ["癸"],
    ["丙", "庚", "戊"],
    ["戊", "乙", "癸"],
  ]);
  expect(c.pillars.map((p) => p.tenGod)).toEqual([
    "偏財",
    "正印",
    "日主",
    "傷官",
  ]);
  expect(c.pillars.map((p) => p.stage)).toEqual(["臨官", "長生", "死", "墓"]);
  expect(c.pillars[2].naYin).toBe("白蠟金");
});
it("23:00 configurable boundary reference test2a", () =>
  expect(
    calculateBazi(profile("1988-02-15", "23:30"), 1).pillars[2].ganZhi,
  ).toBe("辛丑"));
it("00:00 day matches prior late zi under sect1", () =>
  expect(
    calculateBazi(profile("1988-02-16", "00:00"), 2).pillars[2].ganZhi,
  ).toBe("辛丑"));
it("year/month boundary at Li Chun", () => {
  const a = calculateBazi(profile("2024-02-04", "16:00"));
  const b = calculateBazi(profile("2024-02-04", "17:00"));
  expect(a.pillars.slice(0, 2).map((p) => p.ganZhi)).toEqual(["癸卯", "乙丑"]);
  expect(b.pillars.slice(0, 2).map((p) => p.ganZhi)).toEqual(["甲辰", "丙寅"]);
});
it("upstream YunTest exact starting age/date", () =>
  expect(
    calculateBazi(profile("1981-01-29", "23:37", { gender: "female" })).luck
      .start,
  ).toEqual({ years: 8, months: 0, days: 20, date: "1989-02-18" }));
it("upstream YunTest 3", () =>
  expect(calculateBazi(profile("2020-01-06", "11:22")).luck.start).toEqual({
    years: 0,
    months: 1,
    days: 0,
    date: "2020-02-06",
  }));
it("yang year male forward/female reverse", () => {
  expect(calculateBazi(profile("2000-08-16", "03:00")).luck.forward).toBe(true);
  expect(
    calculateBazi(profile("2000-08-16", "03:00", { gender: "female" })).luck
      .forward,
  ).toBe(false);
});
it("yin year reverses directions", () => {
  expect(calculateBazi(profile()).luck.forward).toBe(false);
  expect(
    calculateBazi(profile("2005-12-23", "08:37", { gender: "female" })).luck
      .forward,
  ).toBe(true);
});
it("surface elements sum to eight, useful god not invented", () => {
  const c = calculateBazi(profile());
  expect(Object.values(c.elements).reduce((a, b) => a + b, 0)).toBe(8);
  expect(c.usefulGod.status).toBe("not-implemented");
});
it("2026 annual stem branch ten god", () =>
  expect(baziYear(calculateBazi(profile()), 2026)).toMatchObject({
    ganZhi: "丙午",
    tenGod: "正官",
  }));
it("reject annual before birth", () =>
  expect(() => baziYear(calculateBazi(profile()), 2000)).toThrow());
it("deterministic JSON", () =>
  expect(calculateBazi(profile())).toEqual(calculateBazi(profile())));
