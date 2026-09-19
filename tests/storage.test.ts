import { it, expect } from "vitest";
import { readStore, writeStore, EMPTY_STORE, STORAGE_KEY } from "@/lib/storage";
import { HistoryRecordSchema } from "@/types/history";
import { calculateIChing } from "@/lib/iching";
import { calculateBazi } from "@/lib/bazi";
import { calculateZiWei } from "@/lib/ziwei";
import { profile } from "./helpers";
function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
it("empty versioned store", () =>
  expect(readStore(memory())).toEqual(EMPTY_STORE));
it("birth profile persists without loss", () => {
  const s = memory();
  writeStore(s, { ...EMPTY_STORE, profile: profile() });
  expect(readStore(s).profile).toEqual(profile());
});
it("corrupted/future data is not silently overwritten", () => {
  const s = memory();
  s.setItem(STORAGE_KEY, "broken");
  expect(() => readStore(s)).toThrow();
  expect(s.getItem(STORAGE_KEY)).toBe("broken");
  s.setItem(STORAGE_KEY, JSON.stringify({ ...EMPTY_STORE, version: 2 }));
  expect(() => readStore(s)).toThrow();
});
it("storage denial propagated", () =>
  expect(() =>
    writeStore(
      {
        setItem: () => {
          throw new Error("quota");
        },
      },
      EMPTY_STORE,
    ),
  ).toThrow("quota"));
it.each(["iching", "bazi", "ziwei"])(
  "full %s chart history roundtrip",
  (system) => {
    const chart =
      system === "iching"
        ? calculateIChing(Array(6).fill([2, 2, 2]))
        : system === "bazi"
          ? calculateBazi(profile())
          : calculateZiWei(profile());
    const record = HistoryRecordSchema.parse({
      id: "r1",
      version: 1,
      type: system,
      createdAt: "2026-09-18T00:00:00.000Z",
      question: "問題",
      birthProfileId: system === "iching" ? null : "test",
      chart,
      interpretation: null,
    });
    const s = memory();
    writeStore(s, { ...EMPTY_STORE, history: [record] });
    expect(readStore(s).history[0]).toEqual(record);
  },
);
it("modified/tampered IChing snapshot fails schema", () => {
  const chart = calculateIChing(Array(6).fill([2, 2, 2]));
  chart.original.name = "wrong";
  expect(() =>
    HistoryRecordSchema.parse({
      id: "x",
      version: 1,
      type: "iching",
      createdAt: "2026-09-18T00:00:00.000Z",
      question: "",
      birthProfileId: null,
      chart,
      interpretation: null,
    }),
  ).toThrow();
});
