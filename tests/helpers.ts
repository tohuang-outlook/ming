import type { BirthProfile } from "@/types";
export function profile(
  date = "2005-12-23",
  time = "08:37",
  patch: Partial<BirthProfile> = {},
): BirthProfile {
  return {
    id: "test",
    name: "",
    gender: "male",
    birthDate: date,
    birthTime: time,
    birthLocation: "台北",
    timezone: "+08:00",
    calendarType: "Gregorian",
    isLeapMonth: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}
