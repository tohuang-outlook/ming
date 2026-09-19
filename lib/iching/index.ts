import { HEXAGRAMS } from "@/data/hexagrams";
export type Coin = 2 | 3;
export type Toss = [Coin, Coin, Coin];
export function coinLine(coins: readonly number[]) {
  if (coins.length !== 3 || coins.some((c) => c !== 2 && c !== 3))
    throw new Error("每次必須輸入三枚銅錢，正面為 3，反面為 2。");
  const value = coins.reduce((a, b) => a + b, 0);
  const yang = value % 2 === 1;
  const moving = value === 6 || value === 9;
  return {
    value,
    yang,
    moving,
    changedYang: moving ? !yang : yang,
    label: (
      { 6: "老陰", 7: "少陽", 8: "少陰", 9: "老陽" } as Record<number, string>
    )[value],
  };
}
export function hexagramFromBits(bits: string) {
  const h = HEXAGRAMS.find((x) => x.binary === bits);
  if (!h) throw new Error("卦象必須為由下往上的六爻。");
  return structuredClone(h);
}
export function calculateIChing(tosses: readonly (readonly number[])[]) {
  if (tosses.length !== 6) throw new Error("請依序完成六次投擲。");
  const lines = tosses.map((t, i) => ({ ...coinLine(t), position: i + 1 }));
  return {
    schemaVersion: 1 as const,
    system: "iching" as const,
    engine: "three-coins-v1",
    status: "tested" as const,
    tosses: tosses.map((t) => [...t]),
    lines,
    original: hexagramFromBits(lines.map((l) => (l.yang ? "1" : "0")).join("")),
    changed: hexagramFromBits(
      lines.map((l) => (l.changedYang ? "1" : "0")).join(""),
    ),
    movingLines: lines.filter((l) => l.moving).map((l) => l.position),
  };
}
export function randomToss(): Toss {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(bytes, (b) => (b % 2 ? 3 : 2)) as Toss;
}
export type IChingChart = ReturnType<typeof calculateIChing>;
