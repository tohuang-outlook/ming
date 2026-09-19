import { test, expect } from "@playwright/test";

test("validated backup restores profile; cancellation preserves existing data", async ({ page }) => {
  await page.goto("/settings");
  const backup = { version: 1, profile: null, settings: { language: "zh-TW", dateFormat: "iso", chartView: "list" }, history: [] };
  await page.getByLabel("從備份還原").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText(/備份已驗證：0 筆紀錄/)).toBeVisible();
  await page.getByRole("button", { name: "取消還原" }).click();
  await expect(page.getByLabel("日期格式")).toHaveValue("zh");
  await page.getByLabel("從備份還原").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole("button", { name: "確認取代並還原" }).click();
  await page.reload();
  await expect(page.getByLabel("日期格式")).toHaveValue("iso");
  await page.getByLabel("從備份還原").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version":99}') });
  await expect(page.getByRole("alert").filter({ hasText: "備份格式不相容" })).toBeVisible();
  await expect(page.getByLabel("日期格式")).toHaveValue("iso");
});

test("nonce CSP permits hydration and produces no policy violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", message => { if (/content security policy|violates.*directive/i.test(message.text())) violations.push(message.text()); });
  const response = await page.goto("/settings");
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toContain("'strict-dynamic'");
  if (process.env.PLAYWRIGHT_PRODUCTION) expect(policy).not.toContain("unsafe-eval");
  await page.getByLabel("日期格式").selectOption("iso");
  await page.getByRole("button", { name: "儲存設定" }).click();
  await expect(page.getByRole("status")).toContainText("設定已儲存");
  expect(violations).toEqual([]);
  const second = await page.reload();
  expect(second?.headers()["content-security-policy"]).not.toEqual(policy);
});
