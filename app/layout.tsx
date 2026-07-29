import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://doucang.xyz"),
  title: "豆仓｜按库存生成清晰拼豆图纸",
  description: "上传图片，按真实豆子库存、指定色号与颜色数量生成清晰拼豆图纸，并自动计算用量、缺货和替代色。",
  alternates: { canonical: "/doucang-bead-pantry/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://doucang.xyz/doucang-bead-pantry/",
    siteName: "豆仓",
    title: "豆仓｜按库存生成清晰拼豆图纸",
    description: "按库存与指定色号生成拼豆图纸，一键去杂色，自动计算用量与缺货。",
    images: [{ url: "https://doucang.xyz/doucang-bead-pantry/doucang-social-preview.png", width: 1730, height: 902, alt: "豆仓拼豆图纸生成器" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "豆仓｜按库存生成清晰拼豆图纸",
    description: "按库存与指定色号生成拼豆图纸，一键去杂色，自动计算用量与缺货。",
    images: ["https://doucang.xyz/doucang-bead-pantry/doucang-social-preview.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
