import { crossBrandColors, type CrossBrandName } from "./brand-colors";
import { mardColors } from "./mard-colors";

export type PaletteSource = "inventory" | "store" | "reference";
export type PaletteBrand = "MARD" | CrossBrandName;

export type CatalogPaletteColor = {
  brand: PaletteBrand;
  series: string;
  code: string;
  name: string;
  color: string;
};

export type StoreRange = {
  id: string;
  series: string;
  fromCode: string;
  toCode: string;
};

export type StorePalettePreset = {
  id: string;
  name: string;
  brand: PaletteBrand;
  ranges: StoreRange[];
  excludedKeys: string[];
  createdAt: number;
  updatedAt: number;
};

export type StorePalettePackage = {
  format: "yilihua-store-palette";
  version: 1;
  exportedAt: number;
  preset: StorePalettePreset;
};

export const paletteBrands: PaletteBrand[] = ["MARD", "Artkal", "Perler", "Hama", "Nabbi", "Yant"];

export function catalogColorKey(brand: string, series: string, code: string) {
  return `${brand}::${series}::${code}`;
}

export function catalogPaletteForBrand(brand: PaletteBrand): CatalogPaletteColor[] {
  if (brand === "MARD") {
    return mardColors.map((item) => ({
      brand,
      series: item.series,
      code: item.code,
      name: "MARD 参考色",
      color: item.hex,
    }));
  }
  return crossBrandColors
    .filter((item) => item.brand === brand)
    .map((item) => ({
      brand: item.brand,
      series: item.series,
      code: item.code,
      name: item.name,
      color: item.hex,
    }));
}

export function paletteSeries(brand: PaletteBrand) {
  return [...new Set(catalogPaletteForBrand(brand).map((item) => item.series))];
}

export function makeStoreRange(brand: PaletteBrand, series?: string, id = `range-${Date.now()}`): StoreRange {
  const catalog = catalogPaletteForBrand(brand);
  const activeSeries = series ?? catalog[0]?.series ?? "";
  const colors = catalog.filter((item) => item.series === activeSeries);
  return {
    id,
    series: activeSeries,
    fromCode: colors[0]?.code ?? "",
    toCode: colors[Math.min(23, Math.max(0, colors.length - 1))]?.code ?? colors[0]?.code ?? "",
  };
}

export function makeStorePalettePreset(brand: PaletteBrand = "MARD", name = "临时店内色号"): StorePalettePreset {
  const now = Date.now();
  return {
    id: `store-${now}`,
    name,
    brand,
    ranges: [makeStoreRange(brand, undefined, `range-${now}`)],
    excludedKeys: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeStoreRange(brand: PaletteBrand, range: StoreRange) {
  const seriesColors = catalogPaletteForBrand(brand).filter((item) => item.series === range.series);
  const fromIndex = seriesColors.findIndex((item) => item.code.toLowerCase() === range.fromCode.toLowerCase());
  const toIndex = seriesColors.findIndex((item) => item.code.toLowerCase() === range.toCode.toLowerCase());
  if (fromIndex < 0 || toIndex < 0) return null;
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return {
    ...range,
    fromCode: seriesColors[start].code,
    toCode: seriesColors[end].code,
    colors: seriesColors.slice(start, end + 1),
  };
}

export function resolveStorePalette(preset: StorePalettePreset) {
  const selected = new Map<string, CatalogPaletteColor>();
  const normalizedRanges: StoreRange[] = [];
  const invalidRangeIds: string[] = [];

  preset.ranges.forEach((range) => {
    const normalized = normalizeStoreRange(preset.brand, range);
    if (!normalized) {
      invalidRangeIds.push(range.id);
      return;
    }
    normalizedRanges.push({
      id: normalized.id,
      series: normalized.series,
      fromCode: normalized.fromCode,
      toCode: normalized.toCode,
    });
    normalized.colors.forEach((color) => selected.set(catalogColorKey(color.brand, color.series, color.code), color));
  });

  const excluded = new Set(preset.excludedKeys);
  const colors = [...selected.entries()].filter(([key]) => !excluded.has(key)).map(([, color]) => color);
  return { colors, normalizedRanges, invalidRangeIds, selectedCount: selected.size };
}

export function isStorePalettePreset(value: unknown): value is StorePalettePreset {
  if (!value || typeof value !== "object") return false;
  const preset = value as Partial<StorePalettePreset>;
  return typeof preset.id === "string"
    && typeof preset.name === "string"
    && paletteBrands.includes(preset.brand as PaletteBrand)
    && Array.isArray(preset.ranges)
    && preset.ranges.every((range) => range && typeof range.id === "string" && typeof range.series === "string" && typeof range.fromCode === "string" && typeof range.toCode === "string")
    && Array.isArray(preset.excludedKeys)
    && preset.excludedKeys.every((key) => typeof key === "string")
    && typeof preset.createdAt === "number"
    && Number.isFinite(preset.createdAt)
    && typeof preset.updatedAt === "number"
    && Number.isFinite(preset.updatedAt);
}
