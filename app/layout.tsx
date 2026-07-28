import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "豆仓 · 库存驱动的拼豆创作",
  description: "按你真实拥有的色号与数量，生成现在就能完成的拼豆图纸。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
