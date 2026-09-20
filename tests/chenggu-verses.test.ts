import { it, expect } from "vitest";
import { chengguVerse } from "@/lib/chenggu/verses";
it.each(Array.from({ length: 51 }, (_, i) => i + 21))("weight %i has exactly four seven-character lines", qian => {
  const lines = chengguVerse(qian);
  expect(lines).toHaveLength(4);
  for (const line of lines!) expect([...line]).toHaveLength(7);
});
it.each([20,72,37.5,NaN,Infinity])("does not invent a verse for %s", qian => expect(chengguVerse(qian)).toBeNull());
it("known four liang maps to the correct traditional verse", () => {
  expect(chengguVerse(40)).toEqual(["平生衣祿是綿長", "件件心中自主張", "前面風霜多受過", "後來必定享安康"]);
  expect(chengguVerse(21)?.[0]).toBe("短命非業謂大空");
  expect(chengguVerse(71)?.[0]).toBe("此命生成大不同");
});
