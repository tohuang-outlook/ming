import { test, expect } from "@playwright/test";
test("mobile six manual tosses build Qian", async ({ page }) => {
  await page.goto("/iching");
  await page
    .getByPlaceholder("例如：對於這次工作的轉變，我可以如何準備？")
    .fill("如何準備新的學習計畫？");
  await page.getByRole("button", { name: "手動擲銅錢", exact: true }).click();
  await page.getByRole("button", { name: "開始卜卦" }).click();
  await page
    .getByRole("button", { name: "第 1 枚：反面 2，點擊翻面", exact: true })
    .click();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "確認本次結果" }).click();
  await expect(page.getByRole("heading", { name: "第 1 卦：乾" })).toHaveCount(
    2,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("birth profile shared by both charts and survives reload", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByLabel("出生日期", { exact: true }).fill("2000-08-16");
  await page.getByLabel("出生時間", { exact: true }).fill("03:00");
  await page.getByRole("button", { name: "儲存並建立命盤" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/bazi");
  await expect(
    page.getByRole("heading", { name: "四柱命盤", exact: true }),
  ).toBeVisible();
  await page.goto("/ziwei");
  await expect(page.getByText("木三局", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "列表模式", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByText("木三局", { exact: true })).toBeVisible();
});

test("save chart, inspect raw casts, AI unavailable, delete with confirmation", async ({
  page,
}) => {
  await page.goto("/iching");
  await page
    .getByPlaceholder("例如：對於這次工作的轉變，我可以如何準備？")
    .fill("如何培養耐心？");
  await page.getByRole("button", { name: "開始卜卦" }).click();
  for (let i = 0; i < 6; i++)
    await page
      .getByRole("button", { name: "擲出三枚銅錢", exact: true })
      .click();
  await page.getByRole("button", { name: "保存紀錄", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page.getByRole("button", { name: "查看詳細解讀", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: process.env.PLAYWRIGHT_PRODUCTION ? "AI 存取保護尚未設定" : "AI 尚未啟用" }),
  ).toContainText(process.env.PLAYWRIGHT_PRODUCTION ? "AI 存取保護尚未設定" : "AI 尚未啟用");
  await page.goto("/history");
  await page.getByRole("button", { name: "查看", exact: true }).click();
  await expect(page.getByText(/原始投擲（由下往上）/)).toBeVisible();
  await page.getByRole("button", { name: "返回紀錄" }).click();
  await page.getByRole("button", { name: "刪除", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "查看", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "刪除", exact: true }).click();
  await page.getByRole("button", { name: "確定刪除", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "這裡將留下你的探索" }),
  ).toBeVisible();
});
test("desktop and mobile homepage screenshots; no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({ path: "work/home-desktop.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "work/home-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
