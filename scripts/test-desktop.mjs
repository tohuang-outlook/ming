import { _electron as electron, expect } from "@playwright/test";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const dataDir = path.join(root, "work/desktop-validation-data");
const report = { timestamp: new Date().toISOString(), platform: process.platform, arch: process.arch, checks: [], liveAI: [], errors: [] };
const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG"].filter(k => process.env[k]).map(k => [k, process.env[k]]));
let app, page;
async function launch() {
  app = await electron.launch({ args: [path.join(root, "work/desktop-app")], env: { ...env, MINGLI_TEST_DATA: dataDir }, timeout: 30000 });
  page = await app.firstWindow();
  page.on("pageerror", e => report.errors.push(e.message));
  page.on("response", r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await expect(page.getByRole("navigation", { name: "主要導覽" })).toBeVisible();
}
async function nav(name) { await page.getByRole("navigation", { name: "主要導覽" }).getByRole("link", { name, exact: true }).click(); }
function passed(name) { report.checks.push(name); console.log("PASS", name); }
try {
  await launch();
  const runtime = await app.evaluate(({ BrowserWindow, app }) => ({ version: app.getVersion(), userData: app.getPath("userData"), preferences: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences() }));
  expect(runtime.preferences.nodeIntegration).toBe(false); expect(runtime.preferences.contextIsolation).toBe(true); expect(runtime.preferences.sandbox).toBe(true);
  expect(await page.evaluate(() => typeof window.require)).toBe("undefined");
  passed("sandbox + isolated bridge");
  expect(await page.evaluate(async () => { try { await fetch("https://example.com"); return false; } catch { return true; } })).toBe(true);
  passed("renderer external network blocked");
  await nav("設定");
  await expect(page.getByRole("heading", { name: "DeepSeek AI 設定" })).toBeVisible();
  const fakeKey = "sk-" + "a".repeat(32);
  await page.getByLabel("DeepSeek API 金鑰", { exact: true }).fill(fakeKey);
  await expect(page.getByLabel("在此 Mac 加密記住金鑰")).toBeChecked();
  await page.getByRole("button", { name: "啟用 DeepSeek", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("金鑰已加密儲存", { timeout: 15000 });
  expect((await readFile(path.join(dataDir, "deepseek.enc"))).includes(Buffer.from(fakeKey))).toBe(false);
  expect((await stat(path.join(dataDir, "deepseek.enc"))).mode & 0o777).toBe(0o600);
  passed("Keychain-protected encryption, no plaintext, mode 0600");
  await page.getByRole("link", { name: "出生資料" }).click();
  await page.getByLabel("出生日期", { exact: true }).fill("2000-08-16");
  await page.getByLabel("出生時間", { exact: true }).fill("03:00");
  await page.getByRole("button", { name: "儲存並建立命盤" }).click();
  await page.waitForURL("**/dashboard");
  await nav("八字命理"); await expect(page.getByRole("heading", { name: "四柱命盤", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "袁天罡稱骨命重" })).toBeVisible();
  await expect(page.getByTestId("chenggu-total")).toHaveText("三兩七錢");
  await expect(page.getByRole("heading", { name: "三兩七錢・稱骨歌" })).toBeVisible();
  await expect(page.locator(".chenggu-verse blockquote p")).toHaveCount(4);
  await expect(page.locator(".chenggu-verse blockquote")).toContainText("此命般般事不成");
  await page.locator("section[aria-labelledby=chenggu-title]").screenshot({ path: "outputs/chenggu-preview.png" });
  passed("Chenggu known lunar date weight displayed");
  await nav("紫微斗數"); await expect(page.getByText("木三局", { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText("木三局", { exact: true })).toBeVisible();
  passed("birth profile + Bazi + Ziwei + reload");
  await app.close(); app = null; await launch();
  expect(await page.evaluate(() => window.mingliDesktop.status())).toMatchObject({ configured: true, remembered: true });
  await nav("紫微斗數"); await expect(page.getByText("木三局", { exact: true })).toBeVisible();
  passed("profile and encrypted key survive full app restart");
  await nav("設定");
  await page.getByRole("button", { name: "移除金鑰", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已移除金鑰");
  expect(await page.evaluate(() => window.mingliDesktop.status())).toMatchObject({ configured: false, remembered: false });
  await expect(stat(path.join(dataDir, "deepseek.enc"))).rejects.toMatchObject({ code: "ENOENT" });
  passed("key deletion");
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) expect(await page.evaluate(key => window.mingliDesktop.saveKey(key, false), apiKey)).toEqual({});
  async function live(system) {
    if (!apiKey) return;
    const before = await page.evaluate(() => localStorage.getItem("zhonghua-mingli:v1"));
    const start = Date.now();
    await page.getByRole("button", { name: "查看詳細解讀", exact: true }).click();
    await expect(page.getByRole("heading", { name: "命盤概要", exact: true }).first()).toBeVisible({ timeout: 60000 });
    expect(await page.evaluate(() => localStorage.getItem("zhonghua-mingli:v1"))).toBe(before);
    report.liveAI.push({ system, passed: true, milliseconds: Date.now() - start, originalDataUnchanged: true });
    console.log("PASS DeepSeek", system);
  }
  await live("ziwei");
  await nav("八字命理"); await live("bazi");
  await nav("易經卜卦");
  await page.getByPlaceholder("例如：對於這次工作的轉變，我可以如何準備？").fill("如何培養耐心與學習習慣？");
  await page.getByRole("button", { name: "手動擲銅錢", exact: true }).click();
  await page.getByRole("button", { name: "開始卜卦" }).click();
  await page.getByRole("button", { name: "第 1 枚：反面 2，點擊翻面", exact: true }).click();
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "確認本次結果" }).click();
  await expect(page.getByRole("heading", { name: "第 1 卦：乾" })).toHaveCount(2);
  await live("iching");
  await page.getByRole("button", { name: "保存紀錄", exact: true }).click();
  await nav("歷史紀錄"); await expect(page.getByRole("button", { name: "查看", exact: true }).first()).toBeVisible();
  await nav("設定");
  const backup = path.join(root, "work/desktop-validation-backup.json");
  await app.evaluate(({ dialog }, filename) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: filename }); }, backup);
  await page.getByRole("button", { name: "匯出裝置備份", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "備份已匯出" })).toBeVisible();
  const parsed = JSON.parse(await readFile(backup, "utf8")); expect(parsed.profiles.find(p => p.id === parsed.activeProfileId).birthDate).toBe("2000-08-16"); expect(parsed.history.length).toBeGreaterThan(0);
  await page.getByLabel("從備份還原").setInputFiles(backup);
  await page.getByRole("button", { name: "確認取代並還原", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "備份已還原" })).toBeVisible();
  passed("IChing + history + backup export/import");
  await nav("八字命理"); await expect(page.getByRole("heading", { name: "四柱命盤", exact: true })).toBeVisible(); await page.screenshot({ path: "outputs/desktop-app-preview.png" });
  if (apiKey) {
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage })); expect(storage.includes(apiKey)).toBe(false);
    await expect(stat(path.join(dataDir, "deepseek.enc"))).rejects.toMatchObject({ code: "ENOENT" });
  }
  await app.close(); app = null; await launch();
  expect(await page.evaluate(() => window.mingliDesktop.status())).toMatchObject({ configured: false });
  passed("memory-only key cleared on quit");
  expect(report.errors).toEqual([]);
  report.passed = true;
} catch (e) {
  report.passed = false; report.failure = String(e.message).replaceAll(process.env.DEEPSEEK_API_KEY || "__NO_KEY__", "[REDACTED]");
  console.error("Desktop verification failed:", report.failure); process.exitCode = 1;
} finally {
  if (app) await app.close();
  await mkdir("outputs", { recursive: true });
  await writeFile("outputs/desktop-validation.json", JSON.stringify(report, null, 2));
}
