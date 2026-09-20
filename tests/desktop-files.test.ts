import { it, expect } from "vitest";
import { mkdtemp, writeFile, readFile, readdir, rm, mkdir, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { atomicWrite } from "../desktop/files";
it("atomically replaces existing private backups without touching predictable temp files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mingli-files-"));
  try {
    const target = path.join(dir, "backup.json");
    const unrelated = path.join(dir, "unrelated.txt");
    await writeFile(target, "old", { mode: 0o644 });
    await writeFile(unrelated, "preserve");
    await symlink(unrelated, target + ".tmp");
    await atomicWrite(target, "new");
    expect(await readFile(target, "utf8")).toBe("new");
    expect((await stat(target)).mode & 0o777).toBe(0o600);
    expect(await readFile(unrelated, "utf8")).toBe("preserve");
    expect((await readdir(dir)).sort()).toEqual(["backup.json", "backup.json.tmp", "unrelated.txt"]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
it("failed replacement removes staged sensitive bytes and preserves the destination", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mingli-files-"));
  try {
    const destination = path.join(dir, "occupied");
    await mkdir(destination); await writeFile(path.join(destination, "keep"), "original");
    await expect(atomicWrite(destination, "sensitive backup")).rejects.toThrow();
    expect(await readdir(dir)).toEqual(["occupied"]);
    expect(await readFile(path.join(destination, "keep"), "utf8")).toBe("original");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
it("concurrent replacements leave one complete file with no staged leftovers", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mingli-files-"));
  try {
    const target = path.join(dir, "backup.json"); const values = Array.from({ length: 8 }, (_, i) => String(i).repeat(10000));
    await Promise.all(values.map(value => atomicWrite(target, value)));
    expect(values).toContain(await readFile(target, "utf8"));
    expect(await readdir(dir)).toEqual(["backup.json"]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
