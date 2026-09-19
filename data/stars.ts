export const MAJOR_STARS = [
  "紫微",
  "天機",
  "太陽",
  "武曲",
  "天同",
  "廉貞",
  "天府",
  "太陰",
  "貪狼",
  "巨門",
  "天相",
  "天梁",
  "七殺",
  "破軍",
] as const;
export const STAR_REGISTRY: Record<
  string,
  { category: string; source: string }
> = Object.fromEntries([
  ...MAJOR_STARS.map((name) => [
    name,
    { category: "major", source: "iztro@2.6.1/default" },
  ]),
  ...["左輔", "右弼", "文昌", "文曲", "天魁", "天鉞"].map((name) => [
    name,
    { category: "benefic", source: "iztro@2.6.1/default" },
  ]),
  ...["擎羊", "陀羅", "火星", "鈴星"].map((name) => [
    name,
    { category: "malefic", source: "iztro@2.6.1/default" },
  ]),
  ["祿存", { category: "lucun", source: "iztro@2.6.1/default" }],
]);
