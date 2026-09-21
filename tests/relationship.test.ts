import { it, expect } from "vitest";
import { branchRelation, stemRelation, dayMasterRelation, calculateRelationship } from "@/lib/relationship";
import { profile } from "./helpers";
it.each(["甲己", "乙庚", "丙辛", "丁壬", "戊癸"])("stem combination %s is symmetric", pair => { expect(stemRelation(pair[0],pair[1])).toBe("天干五合"); expect(stemRelation(pair[1],pair[0])).toBe("天干五合"); });
it.each(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"])("branch harmony %s is symmetric", pair => { expect(branchRelation(pair[0],pair[1])).toBe("六合"); expect(branchRelation(pair[1],pair[0])).toBe("六合"); });
it.each(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"])("branch clash %s is symmetric", pair => { expect(branchRelation(pair[0],pair[1])).toBe("六沖"); expect(branchRelation(pair[1],pair[0])).toBe("六沖"); });
it("day master directions and ten-god viewpoints are not reversed", () => {
  expect(dayMasterRelation("甲","丙")).toMatchObject({ interaction: "甲方生乙方", bToA: "食神", aToB: "偏印" });
  expect(dayMasterRelation("丙","甲")).toMatchObject({ interaction: "乙方生甲方", bToA: "偏印", aToB: "食神" });
  expect(dayMasterRelation("甲","戊").interaction).toBe("甲方剋乙方");
  expect(dayMasterRelation("戊","甲").interaction).toBe("乙方剋甲方");
  expect(dayMasterRelation("甲","乙").interaction).toBe("同五行");
});
it("identical IDs are rejected while identical birth times with different IDs are allowed", () => {
  expect(() => calculateRelationship(profile(), profile())).toThrow("不同");
  expect(calculateRelationship(profile(), profile(undefined,undefined,{id:"other"})).dayPalace).toBe("同支");
});
it("swapping people transposes every cross-pillar row and preserves counts", () => {
  const a = profile("2000-08-16","03:00",{id:"a"}), b = profile("1990-01-15","12:00",{id:"b"});
  const original = JSON.stringify([a,b]), ab = calculateRelationship(a,b), ba = calculateRelationship(b,a);
  expect(ab.matrix).toHaveLength(16); expect(ba.counts).toEqual(ab.counts);
  for (const row of ab.matrix) expect(ba.matrix.find(r => r.aKey===row.bKey && r.bKey===row.aKey)).toMatchObject({ stem:row.stem, branch:row.branch });
  expect(ab.elements.reduce((n,e)=>n+e.a,0)).toBe(8); expect(ab.elements.reduce((n,e)=>n+e.b,0)).toBe(8);
  expect(JSON.stringify([a,b])).toBe(original);
});
it("unlisted pairs and invalid symbols are handled explicitly", () => {
  expect(branchRelation("子","寅")).toBe("無列入關係"); expect(stemRelation("甲","甲")).toBe("同干");
  expect(() => stemRelation("bad","甲")).toThrow(); expect(() => branchRelation("甲","子")).toThrow();
});
