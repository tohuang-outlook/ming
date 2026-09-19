import { z } from "zod";
export const BirthProfileSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(60).optional(),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "出生時間不完整，因此目前無法準確計算時柱。",
    ),
  birthLocation: z.string().max(120),
  timezone: z.string().min(1).max(80),
  calendarType: z.enum(["Gregorian", "Lunar"]),
  isLeapMonth: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type BirthProfile = z.infer<typeof BirthProfileSchema>;
export type Accuracy = "tested" | "needs-verification" | "not-implemented";
export type System = "iching" | "bazi" | "ziwei";
export const ZiWeiConfigSchema = z.object({
  school: z.literal("iztro-default").default("iztro-default"),
  dayBoundaryRule: z.enum(["23:00", "00:00"]).default("23:00"),
  transformationTable: z.literal("iztro-default").default("iztro-default"),
  leapMonthRule: z
    .enum(["split-at-15", "current-month"])
    .default("split-at-15"),
});
export type ZiWeiCalculationConfig = z.infer<typeof ZiWeiConfigSchema>;
export const defaultZiWeiConfig: ZiWeiCalculationConfig =
  ZiWeiConfigSchema.parse({});
export const DISCLAIMER =
  "本服務以傳統文化、命理研究與娛樂體驗為目的。命理分析具有不同流派與解讀方式，內容僅供參考，不代表確定的未來結果，亦不應取代醫療、法律、財務或其他專業意見。";
export interface Interpretation {
  summary: string;
  sections: { title: string; text: string }[];
  limitations: string[];
}
