import { Lunar, LunarMonth, Solar } from "lunar-typescript";
import { Temporal } from "@js-temporal/polyfill";
import { BirthProfileSchema, type BirthProfile } from "@/types";
export const STEMS = [..."甲乙丙丁戊己庚辛壬癸"];
export const BRANCHES = [..."子丑寅卯辰巳午未申酉戌亥"];
export const SEXAGENARY_CYCLE = Array.from(
  { length: 60 },
  (_, i) => STEMS[i % 10] + BRANCHES[i % 12],
);
export const SOLAR_TERMS = [
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
];
export function validateYear(year: number) {
  if (!Number.isInteger(year) || year < 1901 || year > 2099)
    throw new Error("目前支援 1901–2099 年。");
}
export function doubleHour(hour: number) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23)
    throw new Error("時刻必須為 0–23。");
  return {
    index: Math.floor((hour + 1) / 2) % 12,
    branch: BRANCHES[Math.floor((hour + 1) / 2) % 12],
  };
}
export function gregorianToLunar(date: string) {
  const d = Temporal.PlainDate.from(date, { overflow: "reject" });
  validateYear(d.year);
  const lunar = Solar.fromYmd(d.year, d.month, d.day).getLunar();
  return {
    year: lunar.getYear(),
    month: Math.abs(lunar.getMonth()),
    day: lunar.getDay(),
    isLeapMonth: lunar.getMonth() < 0,
    label: lunar.toString(),
  };
}
export function lunarToGregorian(
  year: number,
  month: number,
  day: number,
  isLeapMonth = false,
) {
  validateYear(year);
  const m = LunarMonth.fromYm(year, isLeapMonth ? -month : month);
  if (!m || !Number.isInteger(day) || day < 1 || day > m.getDayCount())
    throw new Error("農曆日期或閏月不存在，請檢查。");
  return Lunar.fromYmd(year, isLeapMonth ? -month : month, day)
    .getSolar()
    .toYmd();
}
/** Birth wall time is resolved with IANA zone, then converted to fixed Chinese standard time.
 * No implicit browser zone, longitude correction or silent DST disambiguation. */
export function resolveBirth(input: BirthProfile) {
  const p = BirthProfileSchema.parse(input);
  const [y, m, d] = p.birthDate.split("-").map(Number);
  validateYear(y);
  const date =
    p.calendarType === "Lunar"
      ? lunarToGregorian(y, m, d, p.isLeapMonth)
      : Temporal.PlainDate.from(p.birthDate, { overflow: "reject" }).toString();
  let instant: Temporal.ZonedDateTime;
  try {
    instant = Temporal.ZonedDateTime.from(
      `${date}T${p.birthTime}:00[${p.timezone}]`,
      { disambiguation: "reject", overflow: "reject" },
    );
  } catch {
    throw new Error(
      "時區不明，或此時刻因夏令時間而不存在／重複。請確認出生地時區及時間。",
    );
  }
  const cst = instant.withTimeZone("+08:00");
  validateYear(cst.year);
  const solar = Solar.fromYmdHms(
    cst.year,
    cst.month,
    cst.day,
    cst.hour,
    cst.minute,
    cst.second,
  );
  return {
    solar,
    lunar: solar.getLunar(),
    meta: {
      localDate: date,
      localTime: p.birthTime,
      timezone: p.timezone,
      instant: instant.toInstant().toString(),
      calculationTime: solar.toYmdHms(),
      calculationZone: "UTC+08:00",
      timeConvention: "中國標準時間；不校正真太陽時",
    },
  };
}
export function solarTerms(year: number) {
  validateYear(year);
  // A table spans adjacent years; merge two tables and select exact Gregorian year.
  const tables = [
    Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable(),
    Solar.fromYmd(year, 12, 31).getLunar().getJieQiTable(),
  ];
  const map = new Map<
    string,
    { name: string; dateTime: string; timezone: string }
  >();
  for (const table of tables)
    for (const s of Object.values(table)) {
      const name = s.getLunar().getJieQi();
      if (s.getYear() === year && SOLAR_TERMS.includes(name))
        map.set(name, { name, dateTime: s.toYmdHms(), timezone: "UTC+08:00" });
    }
  return [...map.values()].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}
