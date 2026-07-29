import fs from "node:fs";
import path from "node:path";

const sourceRoot = process.argv[2];

if (!sourceRoot) {
  throw new Error("Usage: node scripts/generate-brand-colors.mjs <beadcolors-repo>");
}

const palettes = [
  ["Hama", "Midi 5mm", "hama.csv"],
  ["Hama", "Mini 2.6mm", "hama_mini.csv"],
  ["Hama", "Maxi 10mm", "hama_maxi.csv"],
  ["Perler", "Classic 5mm", "perler.csv"],
  ["Perler", "Mini 2.6mm", "perler_mini.csv"],
  ["Perler", "Caps 5mm", "perler_caps.csv"],
  ["Nabbi", "Midi 5mm", "nabbi.csv"],
  ["Yant", "5mm", "yant.csv"],
  ["Artkal", "A-2.6mm", "artkal_a.csv"],
  ["Artkal", "C-2.6mm", "artkal_c.csv"],
  ["Artkal", "M-2.6mm", "artkal_m.csv"],
  ["Artkal", "R-5mm", "artkal_r.csv"],
  ["Artkal", "S-5mm", "artkal_s.csv"],
];

const colors = palettes.flatMap(([brand, series, file]) => {
  const csvPath = path.join(sourceRoot, "gen", "v1", file);
  return fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/).map((line) => {
    const [code, name, , , , hex] = line.split(",");
    return { brand, series, code, name, hex };
  });
});

const output = `// Generated from maxcleme/beadcolors (MIT). See THIRD_PARTY_NOTICES.md.
export type CrossBrandName = "Artkal" | "Perler" | "Hama" | "Nabbi" | "Yant";
export type CrossBrandColor = { brand: CrossBrandName; series: string; code: string; name: string; hex: string };

export const crossBrandColors: CrossBrandColor[] = ${JSON.stringify(colors, null, 2)};
`;

fs.writeFileSync(path.join(process.cwd(), "app", "brand-colors.ts"), output, "utf8");
console.log(`Generated ${colors.length} colors across ${palettes.length} series.`);
