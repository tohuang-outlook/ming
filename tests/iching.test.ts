import { it, expect } from "vitest";
import { TRIGRAMS, HEXAGRAMS } from "@/data/hexagrams";
import { calculateIChing, coinLine, hexagramFromBits } from "@/lib/iching";
import { ichingFixtures } from "./fixtures/iching";
it.each([
  [2, 2, 2, 6, false, true],
  [3, 2, 2, 7, true, false],
  [3, 3, 2, 8, false, false],
  [3, 3, 3, 9, true, true],
])("coin sum %j", (a, b, c, value, yang, moving) =>
  expect(coinLine([a, b, c] as number[])).toMatchObject({
    value,
    yang,
    moving,
  }),
);
it.each(ichingFixtures)("fixed casts $values", (f) => {
  const tosses = f.values.map((v) =>
    v === 6 ? [2, 2, 2] : v === 7 ? [3, 2, 2] : v === 8 ? [3, 3, 2] : [3, 3, 3],
  );
  const r = calculateIChing(tosses);
  expect(r.original.number).toBe(f.original);
  expect(r.changed.number).toBe(f.changed);
});
it("bottom to top trigram mapping", () =>
  expect(TRIGRAMS).toEqual({
    乾: "111",
    兌: "110",
    離: "101",
    震: "100",
    巽: "011",
    坎: "010",
    艮: "001",
    坤: "000",
  }));
// Independently transcribed traditional table: rows UPPER, columns LOWER; Qian,Dui,Li,Zhen,Xun,Kan,Gen,Kun.
const matrix = [
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2],
];
const bits = Object.values(TRIGRAMS);
it.each(matrix.flatMap((row, u) => row.map((n, l) => ({ n, u, l }))))(
  "King Wen $n upper $u lower $l",
  ({ n, u, l }) => expect(hexagramFromBits(bits[l] + bits[u]).number).toBe(n),
);
it("all 64 unique patterns and full six-line identifiers", () => {
  expect(new Set(HEXAGRAMS.map((h) => h.binary)).size).toBe(64);
  HEXAGRAMS.forEach((h) => expect(h.lineIdentifiers).toHaveLength(6));
});
it("first cast is moving initial line", () => {
  const r = calculateIChing([[2, 2, 2], ...Array(5).fill([3, 2, 2])]);
  expect(r.movingLines).toEqual([1]);
  expect(r.lines[0].position).toBe(1);
});
it.each([[], [[2, 2, 2]], Array(6).fill([1, 2, 3]), Array(6).fill([2, 2])])(
  "rejects malformed throws",
  (t) => expect(() => calculateIChing(t)).toThrow(),
);
