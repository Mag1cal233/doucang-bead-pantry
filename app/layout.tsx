import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://doucang.xyz"),
  title: "一粒画｜把喜欢，一粒粒拼出来",
  description: "上传图片，按真实豆子库存、指定色号与颜色数量生成清晰拼豆图纸，并自动计算用量、缺货和替代色。",
  alternates: { canonical: "/doucang-bead-pantry/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://doucang.xyz/doucang-bead-pantry/",
    siteName: "一粒画",
    title: "一粒画｜把喜欢，一粒粒拼出来",
    description: "按库存与指定色号生成拼豆图纸，一键去杂色，自动计算用量与缺货。",
  },
  twitter: {
    card: "summary_large_image",
    title: "一粒画｜把喜欢，一粒粒拼出来",
    description: "按库存与指定色号生成拼豆图纸，一键去杂色，自动计算用量与缺货。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="./manifest.webmanifest" />
        <meta name="theme-color" content="#fff7fb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="一粒画" />
      </head>
      <body>{children}</body>
    </html>
  );
}
