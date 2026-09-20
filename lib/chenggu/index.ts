import { Solar } from "lunar-typescript";
import { Temporal } from "@js-temporal/polyfill";
import { doubleHour, SEXAGENARY_CYCLE, validateYear } from "@/lib/calendar";

// Traditional numerical lookup data; units are integer qian (10 qian = 1 liang).
// Sources and boundary conventions: docs/chenggu.md.
const YEARS = [12,9,6,7,12,5,9,8,7,8,15,9,16,8,8,19,12,6,8,7,5,15,6,16,15,7,9,12,10,7,15,6,5,14,14,9,7,7,9,12,8,7,13,5,14,5,9,17,5,7,12,8,8,6,19,6,8,16,10,6] as const;
const MONTHS = [6,7,18,9,5,16,9,15,18,8,9,5] as const;
const DAYS = [5,10,8,15,16,15,8,16,8,16,9,17,8,17,10,8,9,18,5,15,10,9,8,9,15,18,7,8,16,6] as const;
const HOURS = [16,6,7,10,9,16,10,8,8,9,6,6] as const;
export function formatWeight(qian: number) {
  if (!Number.isInteger(qian) || qian < 0 || qian > 99) throw new Error("命重數值不正確。");
  const n = "零一二三四五六七八九";
  const liang = Math.floor(qian / 10), rest = qian % 10;
  return liang ? `${n[liang]}兩${rest ? `${n[rest]}錢` : "整"}` : `${n[rest]}錢`;
}
/** Input is the chart's already resolved UTC+08:00 time; never browser local time. */
export function calculateChenggu(calculationTime: string) {
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(calculationTime)) throw new Error("排盤時間格式不正確。");
  const time = Temporal.PlainDateTime.from(calculationTime.replace(" ", "T"), { overflow: "reject" });
  validateYear(time.year);
  const birth = Solar.fromYmdHms(time.year, time.month, time.day, time.hour, time.minute, time.second);
  const shifted = time.hour === 23;
  const lunar = (shifted ? birth.next(1) : birth).getLunar();
  const month = Math.abs(lunar.getMonth());
  const leap = lunar.getMonth() < 0;
  const effectiveMonth = leap && lunar.getDay() > 15 ? month % 12 + 1 : month;
  const year = lunar.getYearInGanZhi(); // Lunar new year, NOT Li Chun.
  const hour = doubleHour(time.hour);
  const parts = [
    { label: "年重", basis: `${year}年`, qian: YEARS[SEXAGENARY_CYCLE.indexOf(year)] },
    { label: "月重", basis: `${leap ? "閏" : ""}${month}月${effectiveMonth !== month ? `（按 ${effectiveMonth} 月）` : ""}`, qian: MONTHS[effectiveMonth - 1] },
    { label: "日重", basis: `農曆 ${lunar.getDay()} 日`, qian: DAYS[lunar.getDay() - 1] },
    { label: "時重", basis: `${hour.branch}時`, qian: HOURS[hour.index] },
  ];
  const totalQian = parts.reduce((total, part) => total + part.qian, 0);
  return { parts, totalQian, weight: formatWeight(totalQian), lunarYear: lunar.getYear(), month, day: lunar.getDay(), effectiveMonth, leap, shifted };
}
