import { it, expect } from "vitest";
import { calculateZiWei } from "@/lib/ziwei";
import { defaultZiWeiConfig } from "@/types";
import { profile } from "./helpers";
import { ziweiFixtures } from "./fixtures/ziwei";
import { MAJOR_STARS } from "@/data/stars";
it.each(ziweiFixtures)("upstream $date $time $source", (f) => {
  const c = calculateZiWei(
    profile(f.date, f.time, {
      gender: "female",
      calendarType: f.lunar ? "Lunar" : "Gregorian",
      isLeapMonth: !!f.leap,
    }),
    {
      ...defaultZiWeiConfig,
      dayBoundaryRule: f.midnight ? "00:00" : "23:00",
      leapMonthRule: f.noFix ? "current-month" : "split-at-15",
    },
  );
  expect(c.soulPalace).toBe(f.soul);
  expect(c.bodyPalace).toBe(f.body);
  expect(c.fiveElementsClass).toBe(f.element);
});
it("14 upstream star positions in 12 palaces 2023-03-06", () => {
  const c = calculateZiWei(profile("2023-03-06", "07:00"));
  expect(
    c.palaces.map((p) =>
      p.stars.filter((s) => s.category === "major").map((s) => s.name),
    ),
  ).toEqual([
    ["七殺"],
    ["天同"],
    ["武曲"],
    ["太陽"],
    ["破軍"],
    ["天機"],
    ["紫微", "天府"],
    ["太陰"],
    ["貪狼"],
    ["巨門"],
    ["廉貞", "天相"],
    ["天梁"],
  ]);
});
it("upstream 癸四化 positions", () => {
  const c = calculateZiWei(profile("2023-03-06", "07:00"));
  expect(
    c.palaces
      .flatMap((p) => p.stars)
      .filter((s) => s.transformation)
      .map((s) => [s.name, s.transformation]),
  ).toEqual([
    ["破軍", "祿"],
    ["太陰", "科"],
    ["貪狼", "忌"],
    ["巨門", "權"],
  ]);
});
it("12 distinct palaces, all 14 major stars placed once", () => {
  const c = calculateZiWei(profile());
  expect(new Set(c.palaces.map((p) => p.name)).size).toBe(12);
  expect(
    c.palaces
      .flatMap((p) => p.stars)
      .filter((s) => s.category === "major")
      .map((s) => s.name)
      .sort(),
  ).toEqual([...MAJOR_STARS].sort());
});
it("upstream 2023 yearly and decadal for 2000-08-16", () => {
  const c = calculateZiWei(
    profile("2000-08-16", "03:00", { gender: "female" }),
    defaultZiWeiConfig,
    2023,
  );
  expect(c.annual).toMatchObject({
    soulIndex: 1,
    ganZhi: "癸卯",
    transformations: ["破軍", "巨門", "太陰", "貪狼"],
    decadalIndex: 2,
  });
  expect(c.cycles.find((d) => d.index === 2)?.ganZhi).toBe("庚辰");
});
it("cycles start at element class, not arbitrary age zero", () => {
  const c = calculateZiWei(
    profile("2000-08-16", "03:00", { gender: "female" }),
  );
  expect(c.cycles[0]).toMatchObject({ startAge: 3, endAge: 12 });
  expect(c.cycles).toHaveLength(12);
});
it("sequential config isolation and JSON-safe data", () => {
  const p = profile("2023-04-10", "07:00");
  const a = calculateZiWei(p);
  calculateZiWei(p, { ...defaultZiWeiConfig, leapMonthRule: "current-month" });
  expect(calculateZiWei(p)).toEqual(a);
  expect(JSON.parse(JSON.stringify(a))).toEqual(a);
});
it("late zi forward follows next day, current remains", () => {
  const p = profile("1987-09-23", "23:00");
  const next = calculateZiWei(profile("1987-09-24", "00:00"));
  expect(calculateZiWei(p).palaces).toEqual(next.palaces);
});
it("unsupported school rejected", () =>
  expect(() =>
    calculateZiWei(profile(), {
      ...defaultZiWeiConfig,
      school: "invented",
    } as never),
  ).toThrow());
it("missing hour is not silently defaulted", () =>
  expect(() => calculateZiWei(profile("2000-08-16", ""))).toThrow());
