import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "中華命理 AI", template: "%s · 中華命理 AI" },
  description:
    "融合傳統命理智慧與現代 AI 解讀。易經、八字與紫微斗數，由獨立計算引擎排盤。",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101310",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.MINGLI_DESKTOP_BUILD !== "1") await connection();
  return (
    <html lang="zh-Hant">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
