import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChengguView } from "@/components/chenggu-view";
it("corrupt historical timestamp shows an isolated fallback instead of throwing", () => {
  const html = renderToStaticMarkup(createElement(ChengguView, { calculationTime: "old-invalid-time" }));
  expect(html).toContain("原有命盤仍保留");
  expect(html).not.toContain("chenggu-total");
});
it("valid old timestamp renders deterministic weights without migration", () => {
  const html = renderToStaticMarkup(createElement(ChengguView, { calculationTime: "2000-08-16 03:00:00" }));
  expect(html).toContain("三兩七錢");
  expect(html).toContain("庚辰年");
});
