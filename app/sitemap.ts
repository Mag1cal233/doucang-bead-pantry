import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: "https://doucang.xyz/doucang-bead-pantry/",
    lastModified: new Date("2026-08-17"),
    changeFrequency: "weekly",
    priority: 1,
  }];
}
