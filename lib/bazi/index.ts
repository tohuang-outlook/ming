import { LunarUtil, Solar } from "lunar-typescript";
import { resolveBirth, STEMS, validateYear } from "@/lib/calendar";
import type { BirthProfile } from "@/types";
import { traditional as t } from "@/lib/shared/text";
export function calculateBazi(profile: BirthProfile, sect: 1 | 2 = 2) {
  if (sect !== 1 && sect !== 2) throw new Error("不支援的子時換日規則。");
  const { solar, lunar, meta } = resolveBirth(profile);
  const ec = lunar.getEightChar();
  ec.setSect(sect);
  const keys = ["Year", "Month", "Day", "Time"] as const;
  const pillars = keys.map((key, i) => ({
    key: (["year", "month", "day", "time"] as const)[i],
    label: ["年柱", "月柱", "日柱", "時柱"][i],
    ganZhi: ec[`get${key}`](),
    stem: ec[`get${key}Gan`](),
    branch: ec[`get${key}Zhi`](),
    yinYang: STEMS.indexOf(ec[`get${key}Gan`]()) % 2 === 0 ? "陽" : "陰",
    elements: ec[`get${key}WuXing`](),
    hiddenStems: ec[`get${key}HideGan`](),
    tenGod: t(ec[`get${key}ShiShenGan`]()),
    hiddenTenGods: ec[`get${key}ShiShenZhi`]().map(t),
    naYin: t(ec[`get${key}NaYin`]()),
    stage: t(ec[`get${key}DiShi`]()),
  }));
  const elements: Record<string, number> = {
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0,
  };
  for (const p of pillars) for (const e of p.elements) elements[e]++;
  const yun = ec.getYun(profile.gender === "male" ? 1 : 0, 1);
  return {
    schemaVersion: 1 as const,
    system: "bazi" as const,
    engine: "lunar-typescript@1.8.6",
    status: "needs-verification" as const,
    meta,
    lunarDate: t(lunar.toString()),
    dayMaster: ec.getDayGan(),
    pillars,
    elements,
    elementMethod: "八字表層八字計數；不代表旺衰或喜用神",
    usefulGod: { status: "not-implemented" as const },
    rules: {
      yearBoundary: "立春精確時刻",
      monthBoundary: "節令精確時刻",
      dayBoundary: sect === 2 ? "00:00" : "23:00",
      yunSect: 1,
      timeConvention: meta.timeConvention,
    },
    luck: {
      forward: yun.isForward(),
      start: {
        years: yun.getStartYear(),
        months: yun.getStartMonth(),
        days: yun.getStartDay(),
        date: yun.getStartSolar().toYmd(),
      },
      cycles: yun
        .getDaYun(10)
        .filter((d) => d.getIndex() > 0)
        .map((d) => ({
          index: d.getIndex(),
          startAge: d.getStartAge(),
          endAge: d.getEndAge(),
          startYear: d.getStartYear(),
          endYear: d.getEndYear(),
          ganZhi: d.getGanZhi(),
        })),
    },
    birthYear: solar.getYear(),
  };
}
export type BaziChart = ReturnType<typeof calculateBazi>;
export function baziYear(chart: BaziChart, year: number) {
  validateYear(year);
  if (year < chart.birthYear) throw new Error("流年不可早於出生年份。");
  const ganZhi = Solar.fromYmd(year, 7, 1).getLunar().getYearInGanZhiExact();
  // Explicit pairwise relationships only, not automatic transformation or strength judgments.
  const stemPairs = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];
  const branchPairs = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
  const clash = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
  const pair = (arr: string[], a: string, b: string) =>
    arr.some((x) => x === a + b || x === b + a);
  return {
    year,
    ganZhi,
    period: "該年立春至次年立春",
    tenGod: t(LunarUtil.SHI_SHEN[chart.dayMaster + ganZhi[0]]),
    relationshipStatus: "needs-verification" as const,
    relations: chart.pillars.map((p) => ({
      pillar: p.label,
      stem: pair(stemPairs, p.stem, ganZhi[0])
        ? "天干五合"
        : p.stem === ganZhi[0]
          ? "同干"
          : "無列入關係",
      branch: pair(clash, p.branch, ganZhi[1])
        ? "六沖"
        : pair(branchPairs, p.branch, ganZhi[1])
          ? "六合"
          : p.branch === ganZhi[1]
            ? "同支"
            : "無列入關係",
    })),
    limitations: [
      "僅標示五合、六合、六沖與同干支；不推定合化、三合、刑害或吉凶。",
    ],
  };
}
