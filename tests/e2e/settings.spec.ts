import { test, expect } from "@playwright/test";
test("settings changes persist; reset requires confirmation", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByRole("combobox", { name: "紫微命盤顯示", exact: true }).selectOption("list");
  await page.getByRole("combobox", { name: "子時換日", exact: true }).selectOption("00:00");
  await page.getByRole("button", { name: "儲存設定", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "紫微命盤顯示", exact: true })).toHaveValue(
    "list",
  );
  await expect(page.getByRole("combobox", { name: "子時換日", exact: true })).toHaveValue(
    "00:00",
  );
  await page.getByRole("button", { name: "清除全部裝置資料" }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "紫微命盤顯示", exact: true })).toHaveValue(
    "list",
  );
  await page.getByRole("button", { name: "清除全部裝置資料" }).click();
  await page.getByRole("button", { name: "確定清除", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "紫微命盤顯示", exact: true })).toHaveValue(
    "grid",
  );
});
test("fortune produces annual branches and settings reachable on mobile", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByLabel("出生日期", { exact: true }).fill("2000-08-16");
  await page.getByLabel("出生時間", { exact: true }).fill("03:00");
  await page.getByRole("button", { name: "儲存並建立命盤" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/fortune");
  await page.getByLabel("選擇年份").fill("2026");
  await expect(
    page.getByRole("heading", { name: "2026 · 丙午年" }),
  ).toHaveCount(2);
  await page
    .getByRole("link", { name: "設定", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "設定", exact: true }),
  ).toBeVisible();
});
