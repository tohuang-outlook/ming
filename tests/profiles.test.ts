import { it, expect } from "vitest";
import { EMPTY_STORE, StoreSchema, parseBackup, upsertProfile, removeProfile, selectProfile, activeProfile, MAX_PROFILES, readStore, STORAGE_KEY } from "@/lib/storage";
import { calculateBazi } from "@/lib/bazi";
import { profile } from "./helpers";
const a = profile("1990-01-15", "12:00", { id: "a", name: "甲" });
const b = profile("2000-08-16", "03:00", { id: "b", name: "乙" });
const record = { id: "r", version: 1 as const, type: "bazi" as const, createdAt: "2026-09-20T00:00:00.000Z", question: "", birthProfileId: "a", chart: calculateBazi(a), interpretation: null };
it("legacy store migrates without modifying source bytes or history", () => {
  const raw = JSON.stringify({ version: 1, profile: a, settings: EMPTY_STORE.settings, history: [record] });
  const storage = { getItem: (key: string) => key === STORAGE_KEY ? raw : null };
  const migrated = readStore(storage);
  expect(migrated.version).toBe(2); expect(migrated.profiles).toEqual([a]); expect(activeProfile(migrated)).toEqual(a);
  expect(migrated.history).toEqual([record]); expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  expect(parseBackup(raw)).toEqual(migrated);
});
it("legacy empty store migrates to no active person", () => {
  expect(StoreSchema.parse({ version: 1, profile: null, settings: {}, history: [] })).toEqual(EMPTY_STORE);
});
it("add, switch and edit preserve other people and history", () => {
  const original = { ...upsertProfile(EMPTY_STORE, a), history: [record] };
  const two = upsertProfile(original, b);
  expect(activeProfile(two)).toEqual(b); expect(activeProfile(selectProfile(two, "a"))).toEqual(a);
  const edited = upsertProfile(two, { ...a, name: "新甲" });
  expect(edited.profiles).toEqual([{ ...a, name: "新甲" }, b]); expect(edited.history).toEqual([record]);
  expect(original.profiles).toEqual([a]);
});
it("deleting active person chooses another, preserves historical identity and charts", () => {
  const two = { ...upsertProfile(upsertProfile(EMPTY_STORE, b), a), history: [record] };
  const next = removeProfile(two, "a");
  expect(activeProfile(next)).toEqual(b); expect(next.history[0]).toEqual({ ...record, birthProfileName: "甲" });
  expect(activeProfile(removeProfile(next, "b"))).toBeNull();
  expect(removeProfile(next, "b").history).toHaveLength(1);
});
it("deleting inactive person does not change selection", () => {
  expect(removeProfile(upsertProfile(upsertProfile(EMPTY_STORE, a), b), "a").activeProfileId).toBe("b");
});
it("invalid references and duplicate IDs are rejected on import", () => {
  const s = upsertProfile(EMPTY_STORE, a);
  for (const value of [{ ...s, profiles: [a,a] }, { ...s, activeProfileId: "missing" }, { ...s, activeProfileId: null }, { ...EMPTY_STORE, activeProfileId: "a" }])
    expect(() => parseBackup(JSON.stringify(value))).toThrow();
  expect(() => selectProfile(s, "missing")).toThrow(); expect(() => removeProfile(s, "missing")).toThrow();
});
it("100-person limit permits editing but rejects overflow", () => {
  let s = EMPTY_STORE;
  for (let i=0; i<MAX_PROFILES; i++) s = upsertProfile(s, { ...a, id: String(i) });
  expect(() => upsertProfile(s, b)).toThrow("100");
  expect(upsertProfile(s, { ...a, id: "0", name: "編輯" }).profiles).toHaveLength(100);
});
it("multi-person backup preserves active selection and identities", () => {
  const s = { ...upsertProfile(upsertProfile(EMPTY_STORE, a), b), history: [record] };
  expect(parseBackup(JSON.stringify(s))).toEqual(s);
});
