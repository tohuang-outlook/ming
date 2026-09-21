import { LunarUtil } from "lunar-typescript";
import { calculateBazi, type BaziChart } from "@/lib/bazi";
import { STEMS, BRANCHES } from "@/lib/calendar";
import { traditional } from "@/lib/shared/text";
import type { BirthProfile } from "@/types";
const STEM_PAIRS = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];
const BRANCH_PAIRS = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
const CLASH_PAIRS = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
const ELEMENTS = ["木", "火", "土", "金", "水"];
const STEM_ELEMENTS = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const paired = (pairs: string[], a: string, b: string) => pairs.includes(a + b) || pairs.includes(b + a);
export function stemRelation(a: string, b: string) {
  if (!STEMS.includes(a) || !STEMS.includes(b)) throw new Error("天干資料不正確。");
  return a === b ? "同干" : paired(STEM_PAIRS, a, b) ? "天干五合" : "無列入關係";
}
export function branchRelation(a: string, b: string) {
  if (!BRANCHES.includes(a) || !BRANCHES.includes(b)) throw new Error("地支資料不正確。");
  return a === b ? "同支" : paired(BRANCH_PAIRS, a, b) ? "六合" : paired(CLASH_PAIRS, a, b) ? "六沖" : "無列入關係";
}
export function dayMasterRelation(a: string, b: string) {
  const ai = STEMS.indexOf(a), bi = STEMS.indexOf(b);
  if (ai < 0 || bi < 0) throw new Error("日主資料不正確。");
  const ae = STEM_ELEMENTS[ai], be = STEM_ELEMENTS[bi];
  const distance = (ELEMENTS.indexOf(be) - ELEMENTS.indexOf(ae) + 5) % 5;
  return {
    aElement: ae, bElement: be,
    interaction: ["同五行", "甲方生乙方", "甲方剋乙方", "乙方剋甲方", "乙方生甲方"][distance],
    bToA: traditional(LunarUtil.SHI_SHEN[a + b]),
    aToB: traditional(LunarUtil.SHI_SHEN[b + a]),
    stem: stemRelation(a, b),
  };
}
export function compareCharts(a: BaziChart, b: BaziChart) {
  const matrix = a.pillars.flatMap(ap => b.pillars.map(bp => ({
    aKey: ap.key, bKey: bp.key, aLabel: ap.label, bLabel: bp.label,
    aPillar: ap.ganZhi, bPillar: bp.ganZhi,
    stem: stemRelation(ap.stem, bp.stem), branch: branchRelation(ap.branch, bp.branch),
  })));
  return {
    dayMasters: dayMasterRelation(a.dayMaster, b.dayMaster),
    dayPalace: branchRelation(a.pillars[2].branch, b.pillars[2].branch),
    matrix,
    counts: {
      stemCombinations: matrix.filter(r => r.stem === "天干五合").length,
      branchCombinations: matrix.filter(r => r.branch === "六合").length,
      clashes: matrix.filter(r => r.branch === "六沖").length,
    },
    elements: ELEMENTS.map(element => ({ element, a: a.elements[element], b: b.elements[element] })),
  };
}
export function calculateRelationship(a: BirthProfile, b: BirthProfile) {
  if (a.id === b.id) throw new Error("請選擇兩位不同的人物。");
  const aChart = calculateBazi(a), bChart = calculateBazi(b);
  return { a: aChart, b: bChart, ...compareCharts(aChart, bChart) };
}
export function relationshipPrompts(dayPalace: string) {
  if (dayPalace === "六沖") return { title: "日支呈六沖：可從差異談起", text: "傳統將六沖視為相對、變動的符號。可以一起討論作息、花費與衝突時的暫停方式；這不代表一定爭吵或分離。" };
  if (dayPalace === "六合") return { title: "日支呈六合：可從協作談起", text: "傳統以六合象徵連結。可以討論哪些事情適合一起決定、哪些需要個人空間；六合本身不保證感情或合作順利。" };
  if (dayPalace === "同支") return { title: "日支相同：確認相似與不同", text: "兩人的日支相同，但不能據此認定個性相同。各自說出一項重視的需求，再核對彼此理解是否一致。" };
  return { title: "日支未列入六合、六沖或同支", text: "沒有列入這三種關係，不等於沒有緣分。可從實際相處中整理支持彼此的方式、界線與共同目標。" };
}
