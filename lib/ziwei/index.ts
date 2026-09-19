import { astro } from "iztro";
import { resolveBirth, validateYear } from "@/lib/calendar";
import {
  ZiWeiConfigSchema,
  defaultZiWeiConfig,
  type BirthProfile,
  type ZiWeiCalculationConfig,
} from "@/types";
import { STAR_REGISTRY } from "@/data/stars";
export function calculateZiWei(
  profile: BirthProfile,
  config: ZiWeiCalculationConfig = defaultZiWeiConfig,
  targetYear?: number,
) {
  const cfg = ZiWeiConfigSchema.parse(config);
  const { solar, lunar, meta } = resolveBirth(profile);
  if (targetYear !== undefined) {
    validateYear(targetYear);
    if (targetYear < solar.getYear()) throw new Error("流年不可早於出生年份。");
  }
  // iztro uses mutable global settings. Entire operation is synchronous, resets ALL exposed
  // options on every call, never returns native objects with delayed calculation methods.
  const a = astro.withOptions({
    type: "solar",
    dateStr: solar.toYmd(),
    timeIndex:
      solar.getHour() === 23 ? 12 : Math.floor((solar.getHour() + 1) / 2),
    gender: profile.gender,
    fixLeap: cfg.leapMonthRule === "split-at-15",
    language: "zh-TW",
    config: {
      yearDivide: "normal",
      horoscopeDivide: "normal",
      ageDivide: "normal",
      dayDivide: cfg.dayBoundaryRule === "23:00" ? "forward" : "current",
      algorithm: "default",
    },
  });
  const raw = a.rawDates.lunarDate;
  if (
    raw.lunarYear !== lunar.getYear() ||
    raw.lunarMonth !== Math.abs(lunar.getMonth()) ||
    raw.lunarDay !== lunar.getDay() ||
    raw.isLeap !== lunar.getMonth() < 0
  )
    throw new Error(
      "共用曆法與紫微內部曆法不一致，此命盤停止計算並標記待驗證。",
    );
  const palaces = a.palaces.map((p) => ({
    index: p.index,
    name: p.name,
    stem: p.heavenlyStem,
    branch: p.earthlyBranch,
    isBody: p.isBodyPalace,
    stars: [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map((s) => ({
      name: s.name,
      category: STAR_REGISTRY[s.name]?.category ?? s.type,
      palace: p.index,
      transformation: s.mutagen ?? "",
      metadata: {
        brightness: s.brightness ?? "",
        scope: s.scope,
        source: "iztro@2.6.1",
      },
    })),
    decadal: {
      startAge: p.decadal.range[0],
      endAge: p.decadal.range[1],
      ganZhi: p.decadal.heavenlyStem + p.decadal.earthlyBranch,
    },
  }));
  const cycles = a
    .decadalList()
    .map((c) => ({
      index: c.index,
      palaceName: c.palaceName,
      startAge: c.ageRange[0],
      endAge: c.ageRange[1],
      startYear: c.yearRange[0],
      endYear: c.yearRange[1],
      ganZhi: c.heavenlyStem + c.earthlyBranch,
      palaceNames: [...c.palaceNames],
      transformations: [...c.mutagen],
    }));
  const h =
    targetYear === undefined ? undefined : a.horoscope(`${targetYear}-7-1`, 0);
  return {
    schemaVersion: 1 as const,
    system: "ziwei" as const,
    engine: "iztro@2.6.1",
    status: "needs-verification" as const,
    config: cfg,
    meta,
    lunarDate: a.lunarDate,
    gender: profile.gender,
    soulPalace: a.earthlyBranchOfSoulPalace,
    bodyPalace: a.earthlyBranchOfBodyPalace,
    fiveElementsClass: a.fiveElementsClass,
    palaces,
    cycles,
    annual: h
      ? {
          year: targetYear!,
          date: `${targetYear}-07-01`,
          period: "農曆正月至除夕；以該年 7 月 1 日定位",
          soulIndex: h.yearly.index,
          ganZhi: h.yearly.heavenlyStem + h.yearly.earthlyBranch,
          transformations: [...h.yearly.mutagen],
          palaces: h.yearly.palaceNames.map((name, index) => ({
            name,
            index,
            natalPalace: palaces[index].name,
            branch: palaces[index].branch,
          })),
          decadalIndex: h.decadal.index,
        }
      : null,
    limitations: [
      "採 iztro 全書系 default 安星與預設四化表；上游回歸測試不等同獨立命理專家驗證。",
      "農曆年界；閏月與子時規則隨命盤保存；未校正真太陽時。",
    ],
  };
}
export type ZiWeiChart = ReturnType<typeof calculateZiWei>;
