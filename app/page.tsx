"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { crossBrandColors } from "./brand-colors";
import { mardColors, mardSeries } from "./mard-colors";

type Screen = "home" | "inventory" | "catalog" | "create" | "plans" | "craft";
type Strategy = "zero" | "balance" | "quality";
type GeneratedCell = { brand?: string; code: string; color: string; name?: string } | null;
type GeneratedPatterns = Record<Strategy, GeneratedCell[]>;
type PatternView = "chart" | "section" | "preview";
type ColorShift = "original" | "warm" | "cool" | "bright" | "soft";
type UsageItem = { brand: string; code: string; color: string; count: number; name: string };
type Swatch = { brand: string; code: string; name: string; color: string; count: number; safe: number };
type ReplacementScope = "all" | "section";
type ReplacementBrand = "MARD" | "Artkal" | "Perler" | "Hama";
type ReplacementPreview = { fromBrand: string; fromCode: string; brand: string; toCode: string; color: string; name: string; label: string };
type ReplacementHistoryItem = { plan: Strategy; cells: GeneratedCell[]; fromCode: string; toCode: string };
type SavedProject = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  size: number;
  plan: Strategy;
  palette: Array<NonNullable<GeneratedCell>>;
  grid: number[];
  preview: string[];
  beadCount: number;
  completedColors: string[];
  ignoreStock: boolean;
  colorShift: ColorShift;
  view: PatternView;
  projectCompleted: boolean;
};

const swatches: Swatch[] = [
  { brand: "MARD", code: "M1", name: "奶油白", color: "#f5eddb", count: 386, safe: 80 },
  { brand: "MARD", code: "M4", name: "暖杏", color: "#efb77d", count: 246, safe: 40 },
  { brand: "MARD", code: "M7", name: "蜜桃粉", color: "#e98d8c", count: 184, safe: 30 },
  { brand: "MARD", code: "C5", name: "姜黄色", color: "#d89b42", count: 512, safe: 80 },
  { brand: "MARD", code: "C9", name: "榛果棕", color: "#8b5e45", count: 127, safe: 30 },
  { brand: "MARD", code: "A3", name: "鼠尾草", color: "#91a487", count: 298, safe: 60 },
  { brand: "MARD", code: "A8", name: "湖水蓝", color: "#69aeb1", count: 96, safe: 25 },
  { brand: "MARD", code: "N2", name: "炭黑", color: "#35302e", count: 431, safe: 100 },
];

const brandCatalog = [
  { name: "MARD", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "标准 221 + 扩展系列", state: "已建档", tone: "#536d58" },
  { name: "Artkal", origin: "国际品牌", series: "S · C · A · R · M", coverage: "S-5mm 199 项开源参考色", state: "已建档", tone: "#cb7d5a" },
  { name: "Perler", origin: "国际品牌", series: "Classic · Mini · Caps", coverage: "Classic 5mm 103 项开源参考色", state: "已建档", tone: "#d5a13b" },
  { name: "Hama", origin: "国际品牌", series: "Mini · Midi · Maxi · Bio", coverage: "Midi 5mm 92 项开源参考色", state: "已建档", tone: "#739a9c" },
  { name: "Nabbi", origin: "国际品牌", series: "Midi · Mini", coverage: "常用色与透明系列", state: "校准中", tone: "#8c779d" },
  { name: "Yant", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "基础与扩展色板", state: "校准中", tone: "#b66b70" },
  { name: "COCO 可可", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "常用套装与单色", state: "待复核", tone: "#9c745c" },
  { name: "漫漫", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#708c72" },
  { name: "盼盼拼豆", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#bf7658" },
  { name: "卡卡家", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#687f98" },
];

const demoCatalogColors = [
  ["A1", "#faf4c8"], ["A4", "#fbed56"], ["A6", "#feac4c"], ["A10", "#f77c31"],
  ["A14", "#fd543d"], ["A19", "#fd7c72"], ["B2", "#63f347"], ["B8", "#1c9c4f"],
  ["B10", "#95d3c2"], ["B21", "#156a6b"], ["C3", "#86b8e5"], ["C8", "#4977bc"],
  ["D2", "#7065a8"], ["D7", "#b985ba"], ["E4", "#f09ec1"], ["E9", "#cc587d"],
  ["F3", "#b98563"], ["F8", "#754631"], ["G2", "#e7dfd0"], ["G7", "#8f8a82"],
  ["H1", "#f8f5ed"], ["H5", "#272626"], ["M3", "#d8ccb6"], ["M8", "#a69680"],
] as const;

const catPattern = [
  "....nn...nn....",
  "...nccn.nccn...",
  "..nccccnccccn..",
  "..ncccccccccn..",
  ".ncccccccccccn.",
  ".nccncccccnccn.",
  ".ncnoncccnoncn.",
  ".nccccppcccccn.",
  ".ncccpnnnpcccn.",
  "..ncccccccccn..",
  "...nccnnnccn...",
  "....ncccccn....",
  "...nnnnnnnnn...",
  "..nssnnnnnssn..",
  "..nnn.....nnn..",
];

const pixelColors: Record<string, string> = {
  ".": "transparent",
  n: "#35302e",
  c: "#d89b42",
  o: "#f5eddb",
  p: "#e98d8c",
  s: "#91a487",
};

const fallbackCodes: Record<string, { code: string; name: string; color: string }> = {
  n: { code: "N2", name: "炭黑", color: "#35302e" },
  c: { code: "C5", name: "姜黄色", color: "#d89b42" },
  o: { code: "M1", name: "奶油白", color: "#f5eddb" },
  p: { code: "M7", name: "蜜桃粉", color: "#e98d8c" },
  s: { code: "A3", name: "鼠尾草", color: "#91a487" },
};

const fallbackPattern: GeneratedCell[] = catPattern.flatMap((row) =>
  [...row].map((value) => value === "." ? null : { brand: "MARD", code: fallbackCodes[value].code, color: fallbackCodes[value].color, name: fallbackCodes[value].name }),
);

const fallbackUsage: UsageItem[] = Object.values(fallbackCodes).map((item) => ({
  ...item,
  brand: "MARD",
  count: catPattern.reduce((sum, row) => sum + [...row].filter((value) => fallbackCodes[value]?.code === item.code).length, 0),
}));

function encodePattern(cells: GeneratedCell[]) {
  const palette: Array<NonNullable<GeneratedCell>> = [];
  const indexes = new Map<string, number>();
  const grid = cells.map((cell) => {
    if (!cell) return 0;
    const key = `${cell.brand ?? "MARD"}::${cell.code}::${cell.color}`;
    let paletteIndex = indexes.get(key);
    if (paletteIndex === undefined) {
      paletteIndex = palette.length;
      indexes.set(key, paletteIndex);
      palette.push({ ...cell, brand: cell.brand ?? "MARD" });
    }
    return paletteIndex + 1;
  });
  return { palette, grid };
}

function decodePattern(project: Pick<SavedProject, "palette" | "grid">): GeneratedCell[] {
  return project.grid.map((paletteIndex) => paletteIndex > 0 ? { ...project.palette[paletteIndex - 1] } : null);
}

function createProjectPreview(cells: GeneratedCell[], size: number) {
  const previewSize = 12;
  return Array.from({ length: previewSize * previewSize }, (_, index) => {
    const row = Math.min(size - 1, Math.floor(Math.floor(index / previewSize) * size / previewSize));
    const column = Math.min(size - 1, Math.floor((index % previewSize) * size / previewSize));
    return cells[row * size + column]?.color ?? "transparent";
  });
}

const plans = [
  {
    id: "zero" as Strategy,
    eyebrow: "现在就能拼",
    title: "零补货",
    match: 82,
    stock: 100,
    shortage: 0,
    colors: 8,
    time: "约 2 小时",
    note: "只使用豆仓现有颜色，背景已自动简化。",
  },
  {
    id: "balance" as Strategy,
    eyebrow: "推荐",
    title: "平衡方案",
    match: 91,
    stock: 98,
    shortage: 23,
    colors: 10,
    time: "约 2.5 小时",
    note: "仅补一小包暖杏色，五官和毛色更自然。",
  },
  {
    id: "quality" as Strategy,
    eyebrow: "细节最多",
    title: "效果优先",
    match: 96,
    stock: 87,
    shortage: 186,
    colors: 14,
    time: "约 3 小时",
    note: "保留更多光影层次，需要补购 3 个色号。",
  },
];

function BeadArtwork({ highlight }: { highlight?: string | null }) {
  return (
    <div className="bead-art" role="img" aria-label="橘猫拼豆图纸预览">
      {catPattern.flatMap((row, rowIndex) =>
        [...row].map((value, columnIndex) => {
          const isEmpty = value === ".";
          const isDimmed = highlight && value !== highlight && !isEmpty;
          return (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className={`bead ${isEmpty ? "empty" : ""} ${isDimmed ? "dimmed" : ""}`}
              style={{ "--bead-color": pixelColors[value] } as CSSProperties}
            />
          );
        }),
      )}
    </div>
  );
}

function GeneratedArtwork({ cells, size, highlight }: { cells: GeneratedCell[]; size: number; highlight?: string | null }) {
  return (
    <div
      className={`bead-art generated-art ${size > 40 ? "dense" : ""}`}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      role="img"
      aria-label={`${size}乘${size}库存适配拼豆图纸`}
    >
      {cells.map((cell, index) => (
        <span
          key={index}
          className={`bead ${cell ? "" : "empty"} ${cell && highlight && cell.code !== highlight ? "dimmed" : ""}`}
          style={{ "--bead-color": cell?.color ?? "transparent" } as CSSProperties}
          title={cell?.code}
        />
      ))}
    </div>
  );
}

function textColor(background: string) {
  const { r, g, b } = hexToRgb(background);
  return (r * 299 + g * 587 + b * 114) / 1000 > 154 ? "#27251f" : "#ffffff";
}

function PatternChart({ cells, size, zoom, highlight, startRow = 0, startColumn = 0, rowCount = size, columnCount = size }: { cells: GeneratedCell[]; size: number; zoom: number; highlight?: string | null; startRow?: number; startColumn?: number; rowCount?: number; columnCount?: number }) {
  const cellSize = Math.round(30 * zoom);
  return (
    <div className="chart-scroll" aria-label={`${rowCount}乘${columnCount}高清带色号施工图`}>
      <div className="pattern-chart" style={{ "--chart-cell": `${cellSize}px` } as CSSProperties}>
        <div className="chart-row chart-axis-row">
          <span className="chart-corner">×</span>
          {Array.from({ length: columnCount }, (_, column) => {
            const absoluteColumn = startColumn + column + 1;
            return <span className={`chart-axis ${(absoluteColumn % 5 === 0) ? "major-x" : ""}`} key={column}>{absoluteColumn}</span>;
          })}
        </div>
        {Array.from({ length: rowCount }, (_, row) => {
          const absoluteRow = startRow + row + 1;
          return (
          <div className="chart-row" key={row}>
            <span className={`chart-axis chart-row-axis ${(absoluteRow % 5 === 0) ? "major-y" : ""}`}>{absoluteRow}</span>
            {Array.from({ length: columnCount }, (_, column) => {
              const absoluteColumn = startColumn + column + 1;
              const cell = cells[(absoluteRow - 1) * size + absoluteColumn - 1];
              const dimmed = Boolean(cell && highlight && cell.code !== highlight);
              return (
                <span
                  className={`chart-cell ${(absoluteColumn % 5 === 0) ? "major-x" : ""} ${(absoluteRow % 5 === 0) ? "major-y" : ""} ${dimmed ? "dimmed" : ""}`}
                  key={column}
                  style={cell ? { background: cell.color, color: textColor(cell.color) } : undefined}
                  title={cell ? `${absoluteRow} 行 ${absoluteColumn} 列 · ${cell.code}` : `${absoluteRow} 行 ${absoluteColumn} 列 · 留空`}
                >
                  {cell?.code}
                </span>
              );
            })}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function PrintPatternBook({ cells, size, usage, title }: { cells: GeneratedCell[]; size: number; usage: UsageItem[]; title: string }) {
  const sectionRows = Math.ceil(size / 10);
  const sectionColumns = Math.ceil(size / 10);
  const pageCount = sectionRows * sectionColumns;

  return (
    <div className="print-book" aria-hidden="true">
      {Array.from({ length: pageCount }, (_, pageIndex) => {
        const sectionRow = Math.floor(pageIndex / sectionColumns);
        const sectionColumn = pageIndex % sectionColumns;
        const startRow = sectionRow * 10;
        const startColumn = sectionColumn * 10;
        const rowCount = Math.min(10, size - startRow);
        const columnCount = Math.min(10, size - startColumn);
        const sectionLabel = `${String.fromCharCode(65 + sectionRow)}${sectionColumn + 1}`;
        const counts = new Map<string, UsageItem>();

        for (let row = 0; row < rowCount; row += 1) {
          for (let column = 0; column < columnCount; column += 1) {
            const cell = cells[(startRow + row) * size + startColumn + column];
            if (!cell) continue;
            const brand = cell.brand ?? "MARD";
            const key = `${brand}::${cell.code}`;
            const current = counts.get(key);
            const usageItem = usage.find((item) => item.brand === brand && item.code === cell.code);
            counts.set(key, {
              brand,
              code: cell.code,
              color: cell.color,
              count: (current?.count ?? 0) + 1,
              name: usageItem?.name ?? "色卡色",
            });
          }
        }
        const sectionUsage = [...counts.values()].sort((a, b) => b.count - a.count);
        const sectionBeads = sectionUsage.reduce((sum, item) => sum + item.count, 0);

        return (
          <section className="print-page" key={sectionLabel}>
            <header className="print-header">
              <div><small>豆仓 · 高清分区施工图</small><h1>{title}</h1><p>{size} × {size} · 共 {cells.filter(Boolean).length} 颗 · 10×10 自动分页</p></div>
              <div className="print-section-mark"><small>分区</small><strong>{sectionLabel}</strong><span>第 {startRow + 1}–{startRow + rowCount} 行<br />第 {startColumn + 1}–{startColumn + columnCount} 列</span></div>
            </header>
            <div className="print-chart" style={{ gridTemplateColumns: `8mm repeat(${columnCount}, 13.5mm)` }}>
              <span className="print-corner">×</span>
              {Array.from({ length: columnCount }, (_, column) => {
                const absoluteColumn = startColumn + column + 1;
                return <span className={`print-axis ${(absoluteColumn % 5 === 0) ? "major-x" : ""}`} key={`axis-${column}`}>{absoluteColumn}</span>;
              })}
              {Array.from({ length: rowCount }, (_, row) => {
                const absoluteRow = startRow + row + 1;
                return (
                  <div className="print-row" key={`row-${row}`}>
                    <span className={`print-axis print-row-axis ${(absoluteRow % 5 === 0) ? "major-y" : ""}`}>{absoluteRow}</span>
                    {Array.from({ length: columnCount }, (__, column) => {
                      const absoluteColumn = startColumn + column + 1;
                      const cell = cells[(absoluteRow - 1) * size + absoluteColumn - 1];
                      return (
                        <span
                          className={`print-cell ${(absoluteColumn % 5 === 0) ? "major-x" : ""} ${(absoluteRow % 5 === 0) ? "major-y" : ""}`}
                          key={`cell-${column}`}
                          style={cell ? { background: cell.color, color: textColor(cell.color) } : undefined}
                        >
                          {cell?.code}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="print-legend-title"><b>本页色号</b><span>{sectionUsage.length} 种颜色 · {sectionBeads} 颗</span></div>
            <div className="print-legend">
              {sectionUsage.map((item) => (
                <div key={`${item.brand}-${item.code}`} style={{ background: item.color, color: textColor(item.color) }}>
                  <b>{item.code}</b><span>{item.brand} · {item.name}</span><strong>{item.count} 颗</strong>
                </div>
              ))}
            </div>
            <footer className="print-footer"><span>橙色粗线每 5 格定位 · 空白格无需放豆</span><b>{pageIndex + 1} / {pageCount}</b></footer>
          </section>
        );
      })}
    </div>
  );
}

function downloadPatternPng(cells: GeneratedCell[], size: number, usage: UsageItem[], title: string) {
  const cellSize = 38;
  const axisSize = 34;
  const margin = 42;
  const titleHeight = 92;
  const legendColumns = Math.min(6, Math.max(1, usage.length));
  const legendGap = 12;
  const legendCardWidth = 170;
  const legendCardHeight = 58;
  const legendRows = Math.ceil(usage.length / legendColumns);
  const gridWidth = axisSize + size * cellSize;
  const legendWidth = legendColumns * legendCardWidth + (legendColumns - 1) * legendGap;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(gridWidth, legendWidth) + margin * 2;
  canvas.height = titleHeight + axisSize + size * cellSize + 56 + legendRows * (legendCardHeight + legendGap) + margin;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#302e29";
  context.font = "700 30px Microsoft YaHei, sans-serif";
  context.fillText(title, margin, 48);
  context.fillStyle = "#77736a";
  context.font = "14px Microsoft YaHei, sans-serif";
  context.fillText(`${size} × ${size} · ${cells.filter(Boolean).length} 颗 · 高清带色号施工图`, margin, 75);

  const originX = margin;
  const originY = titleHeight;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (let column = 0; column < size; column += 1) {
    context.fillStyle = "#56524a";
    context.font = "11px Arial, sans-serif";
    context.fillText(String(column + 1), originX + axisSize + column * cellSize + cellSize / 2, originY + axisSize / 2);
  }
  for (let row = 0; row < size; row += 1) {
    context.fillStyle = "#56524a";
    context.font = "11px Arial, sans-serif";
    context.fillText(String(row + 1), originX + axisSize / 2, originY + axisSize + row * cellSize + cellSize / 2);
    for (let column = 0; column < size; column += 1) {
      const cell = cells[row * size + column];
      const x = originX + axisSize + column * cellSize;
      const y = originY + axisSize + row * cellSize;
      context.fillStyle = cell?.color ?? "#ffffff";
      context.fillRect(x, y, cellSize, cellSize);
      if (cell) {
        context.fillStyle = textColor(cell.color);
        context.font = `700 ${cell.code.length > 3 ? 10 : 11}px Arial, sans-serif`;
        context.fillText(cell.code, x + cellSize / 2, y + cellSize / 2 + .5);
      }
    }
  }

  context.lineWidth = 1;
  context.strokeStyle = "#cdd1d1";
  for (let index = 0; index <= size; index += 1) {
    const offset = axisSize + index * cellSize;
    context.beginPath(); context.moveTo(originX + offset, originY + axisSize); context.lineTo(originX + offset, originY + axisSize + size * cellSize); context.stroke();
    context.beginPath(); context.moveTo(originX + axisSize, originY + offset); context.lineTo(originX + axisSize + size * cellSize, originY + offset); context.stroke();
  }
  context.lineWidth = 2;
  context.strokeStyle = "#e1a15d";
  for (let index = 5; index < size; index += 5) {
    const offset = axisSize + index * cellSize;
    context.beginPath(); context.moveTo(originX + offset, originY); context.lineTo(originX + offset, originY + axisSize + size * cellSize); context.stroke();
    context.beginPath(); context.moveTo(originX, originY + offset); context.lineTo(originX + axisSize + size * cellSize, originY + offset); context.stroke();
  }

  const legendY = originY + axisSize + size * cellSize + 44;
  context.textAlign = "left";
  usage.forEach((item, index) => {
    const column = index % legendColumns;
    const row = Math.floor(index / legendColumns);
    const x = margin + column * (legendCardWidth + legendGap);
    const y = legendY + row * (legendCardHeight + legendGap);
    context.fillStyle = item.color;
    context.beginPath(); context.roundRect(x, y, legendCardWidth, legendCardHeight, 9); context.fill();
    context.fillStyle = textColor(item.color);
    context.font = "700 16px Arial, sans-serif";
    context.fillText(item.code, x + 15, y + 23);
    context.font = "12px Microsoft YaHei, sans-serif";
    context.fillText(`${item.brand} · ${item.name} · ${item.count} 颗`, x + 15, y + 42);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}-${size}x${size}-高清施工图.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function perceptualDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const meanRed = (a.r + b.r) / 2;
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return (2 + meanRed / 256) * red * red + 4 * green * green + (2 + (255 - meanRed) / 256) * blue * blue;
}

function applyColorShift(pixel: { r: number; g: number; b: number }, shift: ColorShift) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  if (shift === "warm") return { r: clamp(pixel.r * 1.06 + 8), g: clamp(pixel.g * 1.01 + 2), b: clamp(pixel.b * .92) };
  if (shift === "cool") return { r: clamp(pixel.r * .94), g: clamp(pixel.g * 1.01 + 2), b: clamp(pixel.b * 1.07 + 8) };
  if (shift === "bright") return { r: clamp(pixel.r * 1.08 + 10), g: clamp(pixel.g * 1.08 + 10), b: clamp(pixel.b * 1.08 + 10) };
  if (shift === "soft") {
    const light = (pixel.r + pixel.g + pixel.b) / 3;
    return { r: clamp(pixel.r * .78 + light * .22 + 5), g: clamp(pixel.g * .78 + light * .22 + 5), b: clamp(pixel.b * .78 + light * .22 + 5) };
  }
  return pixel;
}

async function generatePattern(imageUrl: string, size: number, strategy: Strategy, ignoreStock: boolean, inventory: Swatch[], colorShift: ColorShift, maxColors: number): Promise<GeneratedCell[]> {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("无法读取图片");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

  const data = context.getImageData(0, 0, size, size).data;
  const stockColors = inventory.map((item) => ({ ...item, limit: ignoreStock ? Infinity : Math.max(0, item.count - item.safe) }));
  const fullColors = mardColors.map((item) => ({ brand: "MARD", code: item.code, color: item.hex, name: "MARD 公开参考色", count: 0, safe: 0, limit: Infinity }));
  let palette = strategy === "quality"
    ? fullColors
    : strategy === "balance"
      ? stockColors.map((item) => ({ ...item, limit: ignoreStock ? Infinity : item.limit + 35 }))
      : stockColors;

  const pixels = Array.from({ length: size * size }, (_, index) => {
    const offset = index * 4;
    return data[offset + 3] < 32 ? null : applyColorShift({ r: data[offset], g: data[offset + 1], b: data[offset + 2] }, colorShift);
  });
  if (palette.length > maxColors) {
    const nearestHits = palette.map((_, paletteIndex) => ({ paletteIndex, count: 0 }));
    pixels.forEach((pixel) => {
      if (!pixel) return;
      let bestIndex = 0;
      let bestCost = Infinity;
      palette.forEach((item, paletteIndex) => {
        const cost = perceptualDistance(pixel, hexToRgb(item.color));
        if (cost < bestCost) {
          bestCost = cost;
          bestIndex = paletteIndex;
        }
      });
      nearestHits[bestIndex].count += 1;
    });
    const selectedIndexes = new Set(nearestHits.sort((a, b) => b.count - a.count).slice(0, maxColors).map((item) => item.paletteIndex));
    palette = palette.filter((_, paletteIndex) => selectedIndexes.has(paletteIndex));
  }
  const candidates = pixels.map((pixel) => pixel
    ? palette
        .map((item, paletteIndex) => ({ paletteIndex, cost: perceptualDistance(pixel, hexToRgb(item.color)) }))
        .sort((a, b) => a.cost - b.cost)
    : []);
  const priority = pixels
    .map((pixel, index) => ({ index, regret: pixel ? (candidates[index][1]?.cost ?? candidates[index][0].cost) - candidates[index][0].cost : -1 }))
    .filter((item) => item.regret >= 0)
    .sort((a, b) => b.regret - a.regret);
  const remaining = palette.map((item) => item.limit);
  const result: GeneratedCell[] = Array(size * size).fill(null);

  for (const item of priority) {
    const choice = candidates[item.index].find((candidate) => remaining[candidate.paletteIndex] > 0) ?? candidates[item.index][0];
    const selected = palette[choice.paletteIndex];
    result[item.index] = { brand: selected.brand ?? "MARD", code: selected.code, color: selected.color, name: selected.name };
    if (Number.isFinite(remaining[choice.paletteIndex])) remaining[choice.paletteIndex] -= 1;
  }
  return result;
}

function BrandMark() {
  return (
    <button className="brand" aria-label="回到豆仓首页">
      <span className="brand-mark"><i /><i /><i /><i /></span>
      <span>豆仓</span>
    </button>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedBrand, setSelectedBrand] = useState("MARD");
  const [strategy, setStrategy] = useState<Strategy>("zero");
  const [selectedPlan, setSelectedPlan] = useState<Strategy>("zero");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [completedColors, setCompletedColors] = useState<string[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ignoreStock, setIgnoreStock] = useState(false);
  const [gridSize, setGridSize] = useState(29);
  const [maxColors, setMaxColors] = useState(12);
  const [generatedPatterns, setGeneratedPatterns] = useState<GeneratedPatterns | null>(null);
  const [patternView, setPatternView] = useState<PatternView>("chart");
  const [chartZoom, setChartZoom] = useState(1);
  const [chartFocus, setChartFocus] = useState(false);
  const [sectionRow, setSectionRow] = useState(0);
  const [sectionColumn, setSectionColumn] = useState(0);
  const [inventory, setInventory] = useState<Swatch[]>(swatches);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [colorShift, setColorShift] = useState<ColorShift>("original");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogScope, setCatalogScope] = useState<"all" | "base" | "extended">("all");
  const [catalogSeries, setCatalogSeries] = useState("all");
  const [catalogPage, setCatalogPage] = useState(0);
  const [replacementScope, setReplacementScope] = useState<ReplacementScope>("all");
  const [replacementBrand, setReplacementBrand] = useState<ReplacementBrand>("MARD");
  const [replacementPreview, setReplacementPreview] = useState<ReplacementPreview | null>(null);
  const [replacementHistory, setReplacementHistory] = useState<ReplacementHistoryItem[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedPurchaseKeys, setSelectedPurchaseKeys] = useState<string[]>([]);
  const [showBatchReplace, setShowBatchReplace] = useState(false);
  const [batchSimilarity, setBatchSimilarity] = useState(75);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [projectsReady, setProjectsReady] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState("我的库存适配图纸");
  const [showProjects, setShowProjects] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inventoryFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("doucang-inventory-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Swatch[];
        if (Array.isArray(parsed) && parsed.length) setInventory(parsed);
      }
    } catch {
      // Keep the safe starter inventory when local data cannot be read.
    } finally {
      setInventoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!inventoryReady) return;
    window.localStorage.setItem("doucang-inventory-v1", JSON.stringify(inventory));
  }, [inventory, inventoryReady]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("doucang-projects-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as SavedProject[];
        if (Array.isArray(parsed)) setSavedProjects(parsed.filter((item) => item?.id && Array.isArray(item.palette) && Array.isArray(item.grid)).slice(0, 5));
      }
    } catch {
      // Ignore damaged local project data and keep the workspace usable.
    } finally {
      setProjectsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!projectsReady) return;
    try {
      window.localStorage.setItem("doucang-projects-v1", JSON.stringify(savedProjects.slice(0, 5)));
    } catch {
      flash("作品存储空间已满，请删除旧作品后重试");
    }
  }, [projectsReady, savedProjects]);

  useEffect(() => {
    setReplacementPreview(null);
  }, [selectedPlan]);

  useEffect(() => {
    if (!showShoppingList && !showBatchReplace && !showProjects) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowShoppingList(false);
        setShowBatchReplace(false);
        setShowProjects(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showBatchReplace, showProjects, showShoppingList]);

  const currentPlan = plans.find((plan) => plan.id === selectedPlan) ?? plans[0];
  const totalStock = useMemo(() => inventory.reduce((sum, item) => sum + item.count, 0), [inventory]);
  const lowStockCount = useMemo(() => inventory.filter((item) => item.count < item.safe * 4).length, [inventory]);
  const progress = Math.round((completedColors.length / 5) * 100);
  const selectedPattern = generatedPatterns?.[selectedPlan] ?? null;
  const generatedUsage = useMemo(() => {
    if (!selectedPattern) return [];
    const usage = new Map<string, UsageItem>();
    selectedPattern.forEach((cell) => {
      if (!cell) return;
      const brand = cell.brand ?? "MARD";
      const key = `${brand}::${cell.code}`;
      const current = usage.get(key);
      const stockColor = inventory.find((item) => item.brand === brand && item.code === cell.code);
      usage.set(key, { brand, code: cell.code, color: cell.color, count: (current?.count ?? 0) + 1, name: stockColor?.name ?? cell.name ?? "色卡色" });
    });
    return [...usage.values()].sort((a, b) => b.count - a.count);
  }, [selectedPattern, inventory]);
  const actualProgress = generatedUsage.length ? Math.round((completedColors.length / generatedUsage.length) * 100) : progress;
  const craftPattern = selectedPattern ?? fallbackPattern;
  const craftSize = selectedPattern ? gridSize : 15;
  const craftUsage = generatedUsage.length ? generatedUsage : fallbackUsage;
  const projectDisplayTitle = generatedPatterns ? currentProjectTitle : "橘猫午后";
  const purchaseItems = useMemo(() => craftUsage.map((item) => {
    const stock = inventory.find((entry) => entry.brand === item.brand && entry.code === item.code);
    const current = stock?.count ?? 0;
    const safe = stock?.safe ?? 0;
    const usable = Math.max(0, current - safe);
    return {
      ...item,
      brand: stock?.brand ?? "MARD",
      current,
      safe,
      usable,
      shortage: Math.max(0, item.count - usable),
    };
  }).filter((item) => item.shortage > 0).sort((a, b) => b.shortage - a.shortage), [craftUsage, inventory]);
  const purchaseGroups = useMemo(() => [...new Set(purchaseItems.map((item) => item.brand))].map((brand) => ({
    brand,
    items: purchaseItems.filter((item) => item.brand === brand),
  })), [purchaseItems]);
  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + item.shortage, 0);
  const selectedPurchaseItems = purchaseItems.filter((item) => selectedPurchaseKeys.includes(`${item.brand}::${item.code}`));
  const selectedPurchaseTotal = selectedPurchaseItems.reduce((sum, item) => sum + item.shortage, 0);
  const batchReplacementPlan = useMemo(() => {
    if (!generatedPatterns) return [];
    const remaining = new Map<string, number>();
    inventory.forEach((item) => remaining.set(`${item.brand}::${item.code}`, Math.max(0, item.count - item.safe)));
    craftUsage.forEach((item) => {
      const key = `${item.brand}::${item.code}`;
      remaining.set(key, Math.max(0, (remaining.get(key) ?? 0) - item.count));
    });

    return purchaseItems.map((source) => {
      const sourceRgb = hexToRgb(source.color);
      const candidates = inventory
        .filter((item) => item.brand !== source.brand || item.code !== source.code)
        .map((item) => {
          const available = remaining.get(`${item.brand}::${item.code}`) ?? 0;
          const distance = perceptualDistance(sourceRgb, hexToRgb(item.color));
          const similarity = Math.max(0, Math.round(100 - Math.sqrt(distance) / 5));
          return { ...item, available, similarity, distance };
        })
        .filter((item) => item.available >= source.count && item.similarity >= batchSimilarity)
        .sort((a, b) => b.similarity - a.similarity || b.available - a.available);
      const target = candidates[0];
      if (target) {
        const key = `${target.brand}::${target.code}`;
        remaining.set(key, (remaining.get(key) ?? 0) - source.count);
      }
      return { source, target };
    });
  }, [batchSimilarity, craftUsage, generatedPatterns, inventory, purchaseItems]);
  const resolvedBatchReplacements = batchReplacementPlan.filter((item) => item.target);
  const batchChangedCells = resolvedBatchReplacements.reduce((sum, item) => sum + item.source.count, 0);
  const batchResolvedShortage = resolvedBatchReplacements.reduce((sum, item) => sum + item.source.shortage, 0);
  const chartHighlight = selectedPattern ? highlight : (highlight ? fallbackCodes[highlight]?.code ?? highlight : null);
  const previewHighlight = selectedPattern ? highlight : (highlight ? Object.entries(fallbackCodes).find(([, item]) => item.code === highlight)?.[0] ?? highlight : null);
  const sectionRowCount = Math.ceil(craftSize / 10);
  const sectionColumnCount = Math.ceil(craftSize / 10);
  const activeSectionRow = Math.min(sectionRow, sectionRowCount - 1);
  const activeSectionColumn = Math.min(sectionColumn, sectionColumnCount - 1);
  const sectionStartRow = activeSectionRow * 10;
  const sectionStartColumn = activeSectionColumn * 10;
  const sectionHeight = Math.min(10, craftSize - sectionStartRow);
  const sectionWidth = Math.min(10, craftSize - sectionStartColumn);
  const highlightedUsage = highlight ? craftUsage.find((item) => item.code === highlight) : undefined;
  const replacementNeeded = highlight ? craftPattern.reduce((count, cell, index) => {
    if (cell?.code !== highlight || (cell.brand ?? "MARD") !== highlightedUsage?.brand) return count;
    if (replacementScope === "all") return count + 1;
    const row = Math.floor(index / craftSize);
    const column = index % craftSize;
    const inSection = row >= sectionStartRow && row < sectionStartRow + sectionHeight && column >= sectionStartColumn && column < sectionStartColumn + sectionWidth;
    return count + (inSection ? 1 : 0);
  }, 0) : 0;
  const replacementOptions = useMemo(() => {
    if (!generatedPatterns || !highlight || !highlightedUsage) return [];
    const sourceRgb = hexToRgb(highlightedUsage.color);
    const sourceWarmth = sourceRgb.r - sourceRgb.b;
    const palette = replacementBrand === "MARD"
      ? mardColors.map((item) => ({ brand: "MARD", code: item.code, name: "MARD 参考色", hex: item.hex }))
      : crossBrandColors.filter((item) => item.brand === replacementBrand);
    const scored = palette
      .filter((item) => item.code !== highlight || item.brand !== highlightedUsage.brand)
      .map((item) => {
        const rgb = hexToRgb(item.hex);
        return { ...item, color: item.hex, distance: perceptualDistance(sourceRgb, rgb), warmth: rgb.r - rgb.b };
      })
      .sort((a, b) => a.distance - b.distance);
    const chosen: Array<(typeof scored)[number] & { label: string }> = [];
    const add = (label: string, candidate?: (typeof scored)[number]) => {
      if (candidate && !chosen.some((item) => item.code === candidate.code)) chosen.push({ ...candidate, label });
    };
    add("最接近", scored[0]);
    if (replacementBrand === "MARD") {
      add("偏暖", scored.find((item) => item.warmth > sourceWarmth + 8));
      add("偏冷", scored.find((item) => item.warmth < sourceWarmth - 8));
    } else {
      add("次接近", scored[1]);
      add("第三接近", scored[2]);
    }
    for (const candidate of scored) {
      if (chosen.length >= 3) break;
      add("备选", candidate);
    }
    return chosen.map((item) => {
      const stock = inventory.find((entry) => entry.brand === item.brand && entry.code === item.code);
      const available = Math.max(0, (stock?.count ?? 0) - (stock?.safe ?? 0));
      return { ...item, available, shortage: Math.max(0, replacementNeeded - available), similarity: Math.max(0, Math.round(100 - Math.sqrt(item.distance) / 5)) };
    });
  }, [generatedPatterns, highlight, highlightedUsage, inventory, replacementBrand, replacementNeeded]);
  const displayPattern = useMemo(() => {
    if (!replacementPreview) return craftPattern;
    return craftPattern.map((cell, index) => {
      if (cell?.code !== replacementPreview.fromCode || (cell.brand ?? "MARD") !== replacementPreview.fromBrand) return cell;
      if (replacementScope === "section") {
        const row = Math.floor(index / craftSize);
        const column = index % craftSize;
        if (row < sectionStartRow || row >= sectionStartRow + sectionHeight || column < sectionStartColumn || column >= sectionStartColumn + sectionWidth) return cell;
      }
      return { brand: replacementPreview.brand, code: replacementPreview.toCode, color: replacementPreview.color, name: replacementPreview.name };
    });
  }, [craftPattern, craftSize, replacementPreview, replacementScope, sectionHeight, sectionStartColumn, sectionStartRow, sectionWidth]);
  const selectedCrossBrandColors = crossBrandColors.filter((item) => item.brand === selectedBrand);
  const catalogSource = selectedBrand === "MARD"
    ? mardColors.map((item) => ({ code: item.code, name: "MARD 参考色", color: item.hex, series: item.series, range: item.range, confidence: item.confidence }))
    : selectedCrossBrandColors.length
      ? selectedCrossBrandColors.map((item) => ({ code: item.code, name: item.name, color: item.hex, series: item.series, range: "base" as const, confidence: "open-reference" as const }))
      : demoCatalogColors.map(([code, color]) => ({ code, name: code, color, series: code.replace(/\d/g, ""), range: "base" as const, confidence: "reference" as const }));
  const catalogSeriesOptions = selectedBrand === "MARD" ? mardSeries : [...new Set(catalogSource.map((item) => item.series))];
  const filteredCatalog = catalogSource.filter((item) => {
    const matchesQuery = !catalogQuery || item.code.toLowerCase().includes(catalogQuery.toLowerCase()) || item.name.toLowerCase().includes(catalogQuery.toLowerCase()) || item.color.toLowerCase().includes(catalogQuery.toLowerCase());
    const matchesScope = catalogScope === "all" || item.range === catalogScope;
    const matchesSeries = catalogSeries === "all" || item.series === catalogSeries;
    return matchesQuery && matchesScope && matchesSeries;
  });
  const catalogPageSize = 48;
  const catalogPageCount = Math.max(1, Math.ceil(filteredCatalog.length / catalogPageSize));
  const activeCatalogPage = Math.min(catalogPage, catalogPageCount - 1);
  const visibleCatalog = filteredCatalog.slice(activeCatalogPage * catalogPageSize, (activeCatalogPage + 1) * catalogPageSize);

  useEffect(() => {
    if (!projectsReady || !activeProjectId || !selectedPattern) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      const encoded = encodePattern(selectedPattern);
      setSavedProjects((projects) => {
        const existing = projects.find((project) => project.id === activeProjectId);
        const next: SavedProject = {
          id: activeProjectId,
          title: currentProjectTitle,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          size: gridSize,
          plan: selectedPlan,
          palette: encoded.palette,
          grid: encoded.grid,
          preview: createProjectPreview(selectedPattern, gridSize),
          beadCount: selectedPattern.filter(Boolean).length,
          completedColors,
          ignoreStock,
          colorShift,
          view: patternView,
          projectCompleted,
        };
        return [next, ...projects.filter((project) => project.id !== activeProjectId)].slice(0, 5);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeProjectId, colorShift, completedColors, currentProjectTitle, gridSize, ignoreStock, patternView, projectCompleted, projectsReady, selectedPattern, selectedPlan]);

  function go(next: Screen) {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    setGeneratedPatterns(null);
    setCompletedColors([]);
    setProjectCompleted(false);
    setReplacementPreview(null);
    setReplacementHistory([]);
    setActiveProjectId(null);
    setCurrentProjectTitle("我的库存适配图纸");
  }

  function startNewProject() {
    setGeneratedPatterns(null);
    setUploadedImage(null);
    setActiveProjectId(null);
    setCurrentProjectTitle("我的库存适配图纸");
    setCompletedColors([]);
    setProjectCompleted(false);
    setReplacementPreview(null);
    setReplacementHistory([]);
    setPatternView("chart");
    setShowProjects(false);
    go("create");
  }

  function restoreProject(project: SavedProject) {
    const cells = decodePattern(project);
    setGeneratedPatterns({ zero: cells, balance: cells, quality: cells });
    setGridSize(project.size);
    setSelectedPlan(project.plan);
    setStrategy(project.plan);
    setCompletedColors(project.completedColors ?? []);
    setIgnoreStock(project.ignoreStock);
    setColorShift(project.colorShift);
    setPatternView(project.view ?? (project.size > 58 ? "section" : "chart"));
    setProjectCompleted(project.projectCompleted);
    setCurrentProjectTitle(project.title || "未命名作品");
    setActiveProjectId(project.id);
    setReplacementPreview(null);
    setReplacementHistory([]);
    setShowProjects(false);
    go("craft");
  }

  function renameProject(id: string, title: string) {
    setSavedProjects((projects) => projects.map((project) => project.id === id ? { ...project, title, updatedAt: Date.now() } : project));
    if (activeProjectId === id) setCurrentProjectTitle(title);
  }

  function deleteProject(id: string) {
    const project = savedProjects.find((item) => item.id === id);
    if (!window.confirm(`确定删除“${project?.title || "未命名作品"}”吗？此操作无法撤销。`)) return;
    setSavedProjects((projects) => projects.filter((item) => item.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
    flash("作品已从当前设备删除");
  }

  function adjustInventory(brand: string, code: string, change: number) {
    setInventory((items) => items.map((item) => item.brand === brand && item.code === code ? { ...item, count: Math.max(0, item.count + change) } : item));
  }

  function exportInventory() {
    const header = "品牌,色号,颜色名称,HEX,数量,安全库存";
    const rows = inventory.map((item) => [item.brand, item.code, item.name, item.color, item.count, item.safe].join(","));
    const blob = new Blob([`\uFEFF${[header, ...rows].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "豆仓库存.csv";
    link.click();
    URL.revokeObjectURL(url);
    flash("库存表已导出");
  }

  async function importInventory(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const imported = lines.slice(1).map((line) => {
        const [brand, code, name, color, count, safe] = line.split(",").map((value) => value.trim());
        return { brand: brand || "MARD", code, name: name || code, color, count: Number(count), safe: Number(safe) } as Swatch;
      }).filter((item) => item.code && /^#[0-9a-f]{6}$/i.test(item.color) && Number.isFinite(item.count) && Number.isFinite(item.safe));
      if (!imported.length) throw new Error("empty");
      setInventory(imported.map((item) => ({ ...item, count: Math.max(0, Math.round(item.count)), safe: Math.max(0, Math.round(item.safe)) })));
      setGeneratedPatterns(null);
      flash(`已导入 ${imported.length} 个库存色号`);
    } catch {
      flash("导入失败，请使用豆仓导出的 CSV 格式");
    } finally {
      event.target.value = "";
    }
  }

  function finishProject() {
    if (projectCompleted) return;
    if (!ignoreStock) {
      const used = new Map(craftUsage.map((item) => [`${item.brand}::${item.code}`, item.count]));
      setInventory((items) => items.map((item) => ({ ...item, count: Math.max(0, item.count - (used.get(`${item.brand}::${item.code}`) ?? 0)) })));
    }
    setProjectCompleted(true);
    flash(ignoreStock ? "作品已完成；采购清单模式不扣库存" : `作品已完成，库存已扣减 ${craftPattern.filter(Boolean).length} 颗`);
  }

  function openShoppingList() {
    setSelectedPurchaseKeys(purchaseItems.map((item) => `${item.brand}::${item.code}`));
    setShowShoppingList(true);
  }

  function togglePurchaseItem(key: string) {
    setSelectedPurchaseKeys((keys) => keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key]);
  }

  function receivePurchasedItems() {
    if (!selectedPurchaseItems.length) {
      flash("请先勾选已经买到的色号");
      return;
    }
    setInventory((items) => {
      const next = items.map((item) => ({ ...item }));
      selectedPurchaseItems.forEach((purchase) => {
        const existingIndex = next.findIndex((item) => item.brand === purchase.brand && item.code === purchase.code);
        if (existingIndex >= 0) {
          next[existingIndex].count += purchase.shortage;
        } else {
          next.push({ brand: purchase.brand, code: purchase.code, name: purchase.name, color: purchase.color, count: purchase.shortage, safe: 0 });
        }
      });
      return next;
    });
    setSelectedPurchaseKeys([]);
    flash(`已入库 ${selectedPurchaseItems.length} 个色号，共 ${selectedPurchaseTotal} 颗`);
  }

  function openBatchReplace() {
    if (!generatedPatterns) {
      flash("请先生成一张图纸，再进行批量换色");
      return;
    }
    setReplacementPreview(null);
    setShowBatchReplace(true);
  }

  function applyBatchReplacements() {
    if (!generatedPatterns || !selectedPattern || !resolvedBatchReplacements.length) return;
    const replacements = new Map(resolvedBatchReplacements.map((item) => [`${item.source.brand}::${item.source.code}`, item.target!]));
    const nextCells = selectedPattern.map((cell) => {
      if (!cell) return cell;
      const target = replacements.get(`${cell.brand ?? "MARD"}::${cell.code}`);
      return target ? { brand: target.brand, code: target.code, color: target.color, name: target.name } : cell;
    });
    setReplacementHistory((history) => [...history.slice(-9), { plan: selectedPlan, cells: selectedPattern, fromCode: "批量换色", toCode: `${resolvedBatchReplacements.length} 组` }]);
    setGeneratedPatterns({ ...generatedPatterns, [selectedPlan]: nextCells });
    setHighlight(null);
    setCompletedColors([]);
    setShowBatchReplace(false);
    setProjectCompleted(false);
    flash(`已批量替换 ${resolvedBatchReplacements.length} 个缺货色，减少缺口 ${batchResolvedShortage} 颗`);
  }

  async function copyShoppingList() {
    if (!purchaseItems.length) {
      flash("当前库存已经足够，无需采购");
      return;
    }
    const lines = [
      `豆仓采购清单｜${projectDisplayTitle}`,
      `${craftSize}×${craftSize}｜缺 ${purchaseItems.length} 个色号，共 ${purchaseTotal} 颗`,
      "已按安全库存预留计算",
      "",
      ...purchaseGroups.flatMap((group) => [
        `【${group.brand}】`,
        ...group.items.map((item) => `${item.code} ${item.name}：买 ${item.shortage} 颗（图纸 ${item.count} / 可用 ${item.usable} / 预留 ${item.safe}）`),
        "",
      ]),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash("采购清单已复制");
    } catch {
      flash("复制失败，请使用导出 CSV");
    }
  }

  function exportShoppingList() {
    if (!purchaseItems.length) {
      flash("当前库存已经足够，无需采购");
      return;
    }
    const header = "品牌,色号,颜色名称,图纸需要,当前库存,安全预留,可用库存,建议购买";
    const rows = purchaseItems.map((item) => [item.brand, item.code, item.name, item.count, item.current, item.safe, item.usable, item.shortage].join(","));
    const blob = new Blob([`\uFEFF${[header, ...rows].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `豆仓采购清单-${craftSize}x${craftSize}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    flash("采购清单已导出");
  }

  function addCatalogColor(code: string, color: string) {
    const supported = selectedBrand === "MARD" || selectedCrossBrandColors.length > 0;
    if (!supported) {
      flash(`${selectedBrand} 色卡仍在校准，暂不写入正式库存`);
      return;
    }
    const catalogItem = catalogSource.find((item) => item.code === code);
    setInventory((items) => {
      const existing = items.find((item) => item.brand === selectedBrand && item.code === code);
      if (existing) return items.map((item) => item === existing ? { ...item, count: item.count + 100 } : item);
      return [...items, { brand: selectedBrand, code, name: catalogItem?.name ?? code, color, count: 100, safe: 20 }];
    });
    flash(`${selectedBrand} ${code} 已加入库存，默认 100 颗`);
  }

  function applyReplacement() {
    if (!generatedPatterns || !selectedPattern || !replacementPreview) return;
    const nextCells = selectedPattern.map((cell, index) => {
      if (cell?.code !== replacementPreview.fromCode || (cell.brand ?? "MARD") !== replacementPreview.fromBrand) return cell;
      if (replacementScope === "section") {
        const row = Math.floor(index / craftSize);
        const column = index % craftSize;
        if (row < sectionStartRow || row >= sectionStartRow + sectionHeight || column < sectionStartColumn || column >= sectionStartColumn + sectionWidth) return cell;
      }
      return { brand: replacementPreview.brand, code: replacementPreview.toCode, color: replacementPreview.color, name: replacementPreview.name };
    });
    setReplacementHistory((history) => [...history.slice(-9), { plan: selectedPlan, cells: selectedPattern, fromCode: replacementPreview.fromCode, toCode: replacementPreview.toCode }]);
    setGeneratedPatterns({ ...generatedPatterns, [selectedPlan]: nextCells });
    setHighlight(replacementPreview.toCode);
    setReplacementPreview(null);
    setProjectCompleted(false);
    flash(`已将 ${replacementNeeded} 格替换为 ${replacementPreview.brand} ${replacementPreview.toCode}`);
  }

  function undoReplacement() {
    const latest = replacementHistory[replacementHistory.length - 1];
    if (!latest) return;
    setGeneratedPatterns((patterns) => patterns ? { ...patterns, [latest.plan]: latest.cells } : patterns);
    setSelectedPlan(latest.plan);
    setHighlight(latest.fromCode === "批量换色" ? null : latest.fromCode);
    setReplacementPreview(null);
    setReplacementHistory((history) => history.slice(0, -1));
    setProjectCompleted(false);
    flash(`已撤销 ${latest.fromCode} → ${latest.toCode}`);
  }

  async function generate() {
    if (!uploadedImage) {
      flash("请先上传一张图片");
      fileRef.current?.click();
      return;
    }
    setIsGenerating(true);
    try {
      const [zero, balance, quality] = await Promise.all([
        generatePattern(uploadedImage, gridSize, "zero", ignoreStock, inventory, colorShift, maxColors),
        generatePattern(uploadedImage, gridSize, "balance", ignoreStock, inventory, colorShift, maxColors),
        generatePattern(uploadedImage, gridSize, "quality", ignoreStock, inventory, colorShift, maxColors),
      ]);
      setGeneratedPatterns({ zero, balance, quality });
      setActiveProjectId(`project-${Date.now()}`);
      setCurrentProjectTitle(`库存适配图纸 · ${gridSize}×${gridSize}`);
      setReplacementPreview(null);
      setReplacementHistory([]);
      setSelectedPlan(ignoreStock ? "quality" : strategy);
      go("plans");
    } catch {
      flash("图片处理失败，请换一张图片重试");
    } finally {
      setIsGenerating(false);
    }
  }

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <BrandMark />
        <nav className="desktop-nav" aria-label="主导航">
          <button className={screen === "home" ? "active" : ""} onClick={() => go("home")}>首页</button>
          <button className={screen === "inventory" ? "active" : ""} onClick={() => go("inventory")}>我的豆仓</button>
          <button className={screen === "catalog" ? "active" : ""} onClick={() => go("catalog")}>品牌色库</button>
          <button className={["create", "plans"].includes(screen) ? "active" : ""} onClick={() => go("create")}>创作</button>
          <button className={screen === "craft" ? "active" : ""} onClick={() => go("craft")}>制作中</button>
        </nav>
        <div className="top-actions">
          <button className="project-pill" onClick={() => setShowProjects(true)}><span>▦</span><b>作品</b><em>{savedProjects.length}</em></button>
          <span className="stock-pill"><i /> {totalStock.toLocaleString()} 颗</span>
          <button className="avatar" aria-label="个人账户">禾</button>
        </div>
      </header>

      {screen === "home" && (
        <div className="page home-page">
          <section className="hero-card">
            <div className="hero-copy">
              <span className="eyebrow"><i /> 库存驱动的拼豆创作</span>
              <h1>你现有的豆，<br />今天能拼出什么？</h1>
              <p>豆仓会按真实库存重新配色，让每一张图纸都能从屏幕走到你的桌面。</p>
              <div className="hero-actions">
                <button className="primary" onClick={() => go("create")}>上传图片生成 <span>→</span></button>
                <button className="secondary" onClick={() => flash("正在按你的库存寻找灵感…")}>看看我能拼什么</button>
              </div>
              <div className="mini-proof">
                <span><b>0</b> 颗也能补货</span>
                <span><b>3</b> 套智能方案</span>
                <span><b>100%</b> 库存可核对</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="art-frame">
                <div className="frame-meta"><span>橘猫午后</span><small>15 × 15</small></div>
                <BeadArtwork />
              </div>
              <div className="floating-card stock-match">
                <span className="ring">100<small>%</small></span>
                <div><b>库存完全满足</b><small>现在就能开始</small></div>
              </div>
              <div className="floating-card save-card"><span>↓</span><div><b>省下 186 颗</b><small>智能替色后</small></div></div>
            </div>
          </section>

          <section className="dashboard-grid">
            <article className="panel inventory-summary">
              <div className="panel-head"><div><small>我的豆仓</small><h2>8 种颜色状态良好</h2></div><button onClick={() => go("inventory")}>管理库存 →</button></div>
              <div className="swatch-stack">
                {inventory.slice(0, 7).map((item) => <i key={`${item.brand}-${item.code}`} style={{ background: item.color }} title={`${item.brand} · ${item.name}`} />)}
                <i className="more">+1</i>
              </div>
              <div className="inventory-stats">
                <div><strong>{totalStock.toLocaleString()}</strong><span>当前总颗数</span></div>
                <div><strong>2</strong><span>建议补充</span></div>
                <div><strong>5</strong><span>可立即开拼</span></div>
              </div>
            </article>
            <article className="panel next-project">
              <div className="mini-art"><BeadArtwork /></div>
              <div><small>为你找到</small><h2>不补货也能拼</h2><p>根据当前余量，推荐 5 张小幅图纸。</p><button onClick={() => flash("5 张库存适配图纸已加入灵感夹")}>查看推荐</button></div>
            </article>
          </section>
        </div>
      )}

      {screen === "inventory" && (
        <div className="page inventory-page">
          <section className="page-title">
            <div><span className="eyebrow">MY BEAD PANTRY</span><h1>我的豆仓</h1><p>让库存保持准确，生成的每张图才真正拼得出来。</p></div>
            <div className="title-actions"><input ref={inventoryFileRef} type="file" accept=".csv,text/csv" hidden onChange={importInventory} /><button className="secondary" onClick={() => inventoryFileRef.current?.click()}>导入 CSV</button><button className="secondary" onClick={exportInventory}>导出库存</button><button className="primary" onClick={() => flash("可先导出 CSV，补充色号后再导入")}>＋ 添加色号</button></div>
          </section>
          <div className="local-save-note"><span>✓</span><div><b>游客模式 · 已保存在本机</b><small>库存只保存在当前设备；可随时导出 CSV 备份或迁移。</small></div></div>
          <section className="inventory-overview">
            <div><span>库存总量</span><strong>{totalStock.toLocaleString()}<small> 颗</small></strong><em>较上次作品 -215</em></div>
            <div><span>已录入色号</span><strong>8<small> 种</small></strong><em>覆盖常用色 72%</em></div>
            <div><span>低于安全线</span><strong>{lowStockCount}<small> 种</small></strong><em className="warning">需要留意</em></div>
            <div><span>可直接完成</span><strong>5<small> 张</small></strong><em>来自灵感夹</em></div>
          </section>
          <section className="panel inventory-table-wrap">
            <div className="table-toolbar"><div><button className="chip active">全部 {inventory.length}</button><button className="chip">库存偏低 {lowStockCount}</button><button className="chip">优先消耗 1</button></div><label className="search">⌕ <input aria-label="搜索色号" placeholder="搜索色号或颜色" /></label></div>
            <div className="inventory-table">
              <div className="table-row table-header"><span>颜色</span><span>色号</span><span>库存状态</span><span>现有数量</span><span>安全库存</span><span>操作</span></div>
              {inventory.map((item, index) => {
                const low = item.count < item.safe * 4;
                return (
                  <div className="table-row" key={`${item.brand}-${item.code}`}>
                    <span className="color-name"><i style={{ background: item.color }} />{item.name}</span>
                    <span><b>{item.code}</b><small>{item.brand}</small></span>
                    <span><em className={low ? "status low" : "status good"}>{low ? "建议补充" : index === 3 ? "优先消耗" : "充足"}</em></span>
                    <span className="count-control"><button aria-label={`减少${item.brand}${item.name}`} onClick={() => adjustInventory(item.brand, item.code, -10)}>−</button><b>{item.count}</b><button aria-label={`增加${item.brand}${item.name}`} onClick={() => adjustInventory(item.brand, item.code, 10)}>＋</button></span>
                    <span>{item.safe} 颗</span>
                    <span><button className="text-button" onClick={() => flash(`${item.code} 已设为生成偏好`)}>设置偏好</button></span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {screen === "catalog" && (
        <div className="page catalog-page">
          <section className="catalog-hero">
            <div>
              <span className="eyebrow">MASTER COLOR LIBRARY</span>
              <h1>全品牌色卡库</h1>
              <p>一个色彩引擎，统一管理不同品牌、尺寸、材质和版本。生成时既能锁定单一品牌，也能跨品牌寻找更合适的库存替代色。</p>
            </div>
            <div className="catalog-seal"><strong>Lab</strong><span>实物色彩标准</span><small>持续更新</small></div>
          </section>

          <section className="catalog-stats">
            <div><strong>10</strong><span>首批常用品牌</span><small>支持继续扩展</small></div>
            <div><strong>全系列</strong><span>尺寸与材质分开建档</span><small>避免同号混用</small></div>
            <div><strong>3 级</strong><span>数据可信度</span><small>公开色卡 · 实物 · 社区</small></div>
            <div><strong>ΔE</strong><span>跨品牌色差</span><small>不是只比较 HEX</small></div>
          </section>

          <section className="catalog-workspace">
            <aside className="panel brand-index">
              <div className="catalog-panel-head"><div><small>品牌目录</small><h2>常用拼豆品牌</h2></div><button onClick={() => flash("已打开新品牌收录申请")}>＋ 申请收录</button></div>
              <label className="catalog-search">⌕ <input aria-label="搜索品牌" placeholder="搜索品牌或系列" /></label>
              <div className="brand-list">
                {brandCatalog.map((brand) => (
                  <button key={brand.name} className={selectedBrand === brand.name ? "active" : ""} onClick={() => { setSelectedBrand(brand.name); setCatalogQuery(""); setCatalogScope("all"); setCatalogSeries("all"); setCatalogPage(0); }}>
                    <i style={{ background: brand.tone }}>{brand.name.slice(0, 1)}</i>
                    <span><b>{brand.name}</b><small>{brand.origin} · {brand.series}</small></span>
                    <em className={brand.state === "已建档" ? "ready" : "pending"}>{brand.state}</em>
                  </button>
                ))}
              </div>
            </aside>

            <div className="panel color-browser">
              <div className="color-browser-head">
                <div><span>当前色卡</span><h2>{selectedBrand}</h2><p>{selectedBrand === "MARD" ? "291 项公开参考色 · 基础与扩展系列分开标记" : brandCatalog.find((brand) => brand.name === selectedBrand)?.coverage}</p></div>
                <div className="version-pill"><i /> {selectedBrand === "MARD" || selectedCrossBrandColors.length ? "公开参考数据" : "校准中"}</div>
              </div>
              <div className="catalog-toolbar">
                <div><button className={`chip ${catalogScope === "all" ? "active" : ""}`} onClick={() => { setCatalogScope("all"); setCatalogPage(0); }}>全部 {catalogSource.length}</button><button className={`chip ${catalogScope === "base" ? "active" : ""}`} onClick={() => { setCatalogScope("base"); setCatalogPage(0); }}>基础系列</button><button className={`chip ${catalogScope === "extended" ? "active" : ""}`} onClick={() => { setCatalogScope("extended"); setCatalogPage(0); }}>扩展 / 特殊</button></div>
                <label className="search">⌕ <input aria-label="搜索品牌色号" placeholder="输入色号或 HEX" value={catalogQuery} onChange={(event) => { setCatalogQuery(event.target.value); setCatalogPage(0); }} /></label>
              </div>
              {(selectedBrand === "MARD" || selectedCrossBrandColors.length > 0) && <div className="series-filter"><button className={catalogSeries === "all" ? "active" : ""} onClick={() => { setCatalogSeries("all"); setCatalogPage(0); }}>全部系列</button>{catalogSeriesOptions.map((series) => <button key={series} className={catalogSeries === series ? "active" : ""} onClick={() => { setCatalogSeries(series); setCatalogPage(0); }}>{series}</button>)}</div>}
              <div className="master-swatches">
                {visibleCatalog.map((item) => (
                  <button key={item.code} onClick={() => addCatalogColor(item.code, item.color)} title={`${item.code} · ${item.color}`}>
                    <i style={{ background: item.color }}><span /></i><b>{item.code}</b><small>{selectedBrand === "MARD" ? item.confidence === "cross-reference" ? "交叉参考" : item.range === "base" ? "基础参考" : "扩展参考" : selectedCrossBrandColors.length ? item.name : "待校准"}</small>
                  </button>
                ))}
              </div>
              {!visibleCatalog.length && <div className="catalog-empty">没有找到匹配色号</div>}
              <div className="catalog-pagination"><span>第 {activeCatalogPage + 1} / {catalogPageCount} 页 · 共 {filteredCatalog.length} 个色号</span><div><button disabled={activeCatalogPage === 0} onClick={() => setCatalogPage(Math.max(0, activeCatalogPage - 1))}>← 上一页</button><button disabled={activeCatalogPage === catalogPageCount - 1} onClick={() => setCatalogPage(Math.min(catalogPageCount - 1, activeCatalogPage + 1))}>下一页 →</button></div></div>
              {selectedBrand === "MARD" && <div className="catalog-source-note"><b>数据说明</b><span>HEX 仅供屏幕预览，不等于实物测色。289 项参考自 <a href="https://www.pixel-beads.com/mard-bead-color-chart" target="_blank" rel="noreferrer">PixelBeads 色卡</a>；公开列表缺少的 T2、T3 由 <a href="https://heybead.com/bead-colors" target="_blank" rel="noreferrer">HeyBead</a> 交叉补充，等待实物复核。</span></div>}
              {selectedCrossBrandColors.length > 0 && <div className="catalog-source-note"><b>数据说明</b><span>{selectedBrand} 的色号、名称与 RGB 参考自 MIT 开源项目 <a href="https://github.com/maxcleme/beadcolors" target="_blank" rel="noreferrer">BeadColors</a>。HEX 仅用于屏幕近似匹配，不代表品牌官方实物测色；不同批次、屏幕和光线均可能产生色差。</span></div>}
            </div>
          </section>

          <section className="catalog-bottom-grid">
            <article className="panel cross-brand-card">
              <div className="cross-copy"><small>CROSS-BRAND MATCH</small><h2>跨品牌近似色</h2><p>缺少某个色号时，按照实物 Lab 色差、材质和熨烫效果推荐候选色，而不是简单复制屏幕颜色。</p><button onClick={() => flash("已进入跨品牌替色体验")}>体验替色</button></div>
              <div className="match-demo">
                <div className="source-color"><i style={{ background: "#d89b42" }} /><span><b>MARD · C5</b><small>目标颜色</small></span></div>
                <div className="match-line"><span>最接近</span><i /></div>
                {["Artkal", "Hama", "Perler"].map((name, index) => <div className="candidate" key={name}><i style={{ background: ["#d99d49", "#d39a42", "#e1a64e"][index] }} /><span><b>{name}</b><small>候选 {index + 1} · 待实物确认</small></span><em>{["1.8", "2.4", "3.1"][index]}</em></div>)}
              </div>
            </article>
            <article className="panel data-standard-card">
              <small>DATA STANDARD</small><h2>每个颜色都有出处</h2>
              <div className="standard-list">
                <div><span className="grade grade-a">A</span><p><b>品牌公开色卡</b><small>确认名称、色号、系列和尺寸</small></p></div>
                <div><span className="grade grade-b">B</span><p><b>实物标准光源测色</b><small>用于最终配色与跨品牌替换</small></p></div>
                <div><span className="grade grade-c">C</span><p><b>用户补充样本</b><small>经过复核后才进入正式色库</small></p></div>
              </div>
              <p className="standard-note">品牌新增、停产或批次变化均保留历史版本，旧图纸不会因更新失效。</p>
            </article>
          </section>
        </div>
      )}

      {screen === "create" && (
        <div className="page create-page">
          <section className="create-heading"><span className="step-tag">01 · 新建图纸</span><h1>从一张喜欢的图片开始</h1><p>我们会保护主体轮廓，再用你真正拥有的颜色重新绘制。</p></section>
          <section className="create-layout">
            <div className="upload-column">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
              <button className={`upload-zone ${uploadedImage ? "has-image" : ""}`} onClick={() => fileRef.current?.click()}>
                {uploadedImage ? <img src={uploadedImage} alt="已上传的参考图片" /> : <><span className="upload-icon">↥</span><b>上传一张照片或插画</b><small>支持 JPG、PNG，建议主体清晰</small><em>选择图片</em></>}
              </button>
              {uploadedImage && <button className="change-image" onClick={() => fileRef.current?.click()}>更换图片</button>}
            </div>
            <div className="settings-panel panel">
              <div className="setting-block size-setting">
                <label>成品尺寸 <span>{gridSize} × {gridSize}</span></label>
                <input type="range" min="15" max="116" value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))} />
                <div className="range-label"><span>15</span><span>{gridSize}</span><span>116</span></div>
                <div className="size-presets" aria-label="常用画布尺寸">
                  {[29, 58, 87, 116].map((size) => <button key={size} className={gridSize === size ? "active" : ""} onClick={() => setGridSize(size)}><b>{size} × {size}</b><small>{size / 29} × {size / 29} 块底板</small></button>)}
                </div>
                {gridSize > 58 && <p className="large-canvas-note"><span>大图模式</span> 将自动使用 10×10 分区施工；建议上传轮廓清晰、分辨率较高的图片。</p>}
              </div>
              <div className="setting-block"><label>生成策略</label><div className="strategy-grid">
                {[{id:"zero",title:"零补货",desc:"完全使用现有库存"},{id:"balance",title:"平衡方案",desc:"允许少量补货"},{id:"quality",title:"效果优先",desc:"保留最多细节"}].map((item) => <button key={item.id} className={strategy === item.id ? "selected" : ""} onClick={() => setStrategy(item.id as Strategy)}><i /><b>{item.title}</b><small>{item.desc}</small></button>)}
              </div></div>
              <div className="setting-row"><div><label>最大颜色数</label><p>减少零散色块，更容易制作</p></div><select aria-label="最大颜色数" value={maxColors} onChange={(event) => setMaxColors(Number(event.target.value))}><option value={8}>8 种</option><option value={12}>12 种</option><option value={16}>16 种</option><option value={24}>24 种</option></select></div>
              <div className="setting-block color-shift-setting">
                <label>色彩偏转 <span>{({ original: "保持原图", warm: "偏暖修正", cool: "偏冷修正", bright: "提亮修正", soft: "柔和修正" } as Record<ColorShift, string>)[colorShift]}</span></label>
                <p>当屏幕颜色与豆子效果不协调时，先调整整体色调，再重新匹配库存色号。</p>
                <div className="color-shift-grid">
                  {([
                    { id: "original", title: "原图", color: "linear-gradient(135deg,#d8a36f,#718fa0)" },
                    { id: "warm", title: "偏暖", color: "linear-gradient(135deg,#f2b46d,#d86f5b)" },
                    { id: "cool", title: "偏冷", color: "linear-gradient(135deg,#72b9c3,#6f78b5)" },
                    { id: "bright", title: "提亮", color: "linear-gradient(135deg,#fff1ad,#b9dce8)" },
                    { id: "soft", title: "柔和", color: "linear-gradient(135deg,#d8c9b7,#9bb3aa)" },
                  ] as { id: ColorShift; title: string; color: string }[]).map((item) => <button key={item.id} className={colorShift === item.id ? "active" : ""} onClick={() => setColorShift(item.id)}><i style={{ background: item.color }} /><b>{item.title}</b></button>)}
                </div>
              </div>
              <div className="setting-row"><div><label>主体优化</label><p>强化五官与外轮廓</p></div><button className="toggle on" aria-label="开启主体优化"><i /></button></div>
              <div className="setting-row"><div><label>保留安全库存</label><p>不消耗常用色的保留颗数</p></div><button className="toggle on" aria-label="开启保留安全库存"><i /></button></div>
              <button className={`ignore-stock-option ${ignoreStock ? "active" : ""}`} onClick={() => setIgnoreStock(!ignoreStock)} aria-pressed={ignoreStock}>
                <span className="infinity-mark">∞</span>
                <span><b>无视当前库存</b><small>按完整品牌色库生成，缺豆保留并生成采购清单</small></span>
                <span className={`toggle ${ignoreStock ? "on" : ""}`}><i /></span>
              </button>
              <button className="generate-button" onClick={generate} disabled={isGenerating}>{isGenerating ? <><i className="spinner" /> 正在计算全局配色…</> : <>{ignoreStock ? "按完整色库生成图纸" : "生成库存适配图纸"} <span>→</span></>}</button>
              <p className="privacy-note">图片仅用于本次生成，不会公开到社区</p>
            </div>
          </section>
        </div>
      )}

      {screen === "plans" && (
        <div className="page plans-page">
          <section className="plans-heading"><div><span className="step-tag">02 · 选择方案</span><h1>同一张图，三种完成方式</h1><p>先看效果，也看清需要多少豆。</p></div><button className="secondary" onClick={() => go("create")}>← 调整设置</button></section>
          {colorShift !== "original" && <div className="color-shift-banner"><span>◐</span><div><b>已应用{({ warm: "偏暖", cool: "偏冷", bright: "提亮", soft: "柔和", original: "原图" } as Record<ColorShift, string>)[colorShift]}偏转</b><small>三套方案都基于修正后的色调匹配；如仍不合适，可返回切换其他方向。</small></div><button onClick={() => go("create")}>更换偏转</button></div>}
          {ignoreStock && <div className="ignore-stock-banner"><span>∞</span><div><b>已无视当前库存</b><small>下列方案按完整品牌色库生成；缺少的颜色不会被替换，并会加入采购清单。</small></div><button onClick={() => { setIgnoreStock(false); go("create"); }}>恢复库存约束</button></div>}
          <section className="plan-grid">
            {plans.map((plan) => (
              <article key={plan.id} className={`plan-card ${selectedPlan === plan.id ? "selected" : ""}`} onClick={() => setSelectedPlan(plan.id)}>
                <div className="plan-badge">{plan.eyebrow}</div>
                <div className="plan-art">{generatedPatterns ? <GeneratedArtwork cells={generatedPatterns[plan.id]} size={gridSize} /> : <BeadArtwork />}</div>
                <div className="plan-title"><div><h2>{plan.title}</h2><p>{plan.note}</p></div><span className="radio"><i /></span></div>
                <div className="score-row"><div><span>还原度</span><strong>{plan.match}<small>分</small></strong></div><div><span>库存满足</span><strong>{plan.stock}<small>%</small></strong></div></div>
                <div className="plan-meta"><span>{generatedPatterns ? new Set(generatedPatterns[plan.id].filter(Boolean).map((cell) => cell?.code)).size : plan.colors} 种颜色</span><span>{plan.time}</span><span className={plan.shortage ? "short" : "enough"}>{ignoreStock ? "生成采购清单" : plan.shortage ? `缺 ${plan.shortage} 颗` : "无需补货"}</span></div>
              </article>
            ))}
          </section>
          <section className="plan-footer panel">
            <div><span>已选择</span><h3>{currentPlan.title}</h3><p>{currentPlan.note}</p></div>
            <div className="usage-preview">{inventory.slice(0, 5).map((item) => <i key={`${item.brand}-${item.code}`} style={{ background: item.color }} />)}<span>共 {currentPlan.colors} 色</span></div>
            <button className="primary" onClick={() => { if (gridSize > 58) setPatternView("section"); go("craft"); }}>使用这套图纸 <span>→</span></button>
          </section>
        </div>
      )}

      {screen === "craft" && (
        <div className="page craft-page">
          <section className="craft-top">
            <div><span className="step-tag">03 · 制作模式</span><h1>{projectDisplayTitle}</h1><p>{currentPlan.title} · {generatedPatterns ? `${gridSize} × ${gridSize} · ${selectedPattern?.filter(Boolean).length ?? 0} 颗` : "15 × 15 · 225 颗"}{activeProjectId && <span className="autosave-state"> · ✓ 已自动保存</span>}</p></div>
            <div className="craft-actions"><button className="shopping-action" onClick={openShoppingList}>采购清单 <span>{purchaseItems.length}</span></button><button className="secondary" onClick={() => window.print()}>打印 / PDF</button><button className="secondary" onClick={() => { downloadPatternPng(craftPattern, craftSize, craftUsage, projectDisplayTitle); flash("高清 PNG 正在下载"); }}>导出高清 PNG</button><button className="primary" disabled={projectCompleted} onClick={finishProject}>{projectCompleted ? "✓ 已完成" : `完成${ignoreStock ? "作品" : "并扣库存"}`}</button></div>
          </section>
          <section className="craft-layout">
            <div className={`craft-canvas panel ${chartFocus ? "chart-focus" : ""}`}>
              <div className="canvas-toolbar">
                <div className="view-switch"><button className={patternView === "chart" ? "active" : ""} onClick={() => setPatternView("chart")}>完整图纸</button><button className={patternView === "section" ? "active" : ""} onClick={() => setPatternView("section")}>10×10 分区拼</button><button className={patternView === "preview" ? "active" : ""} onClick={() => setPatternView("preview")}>成品预览</button></div>
                <div className="chart-tools">
                  {patternView === "chart" && <><button aria-label="缩小图纸" onClick={() => setChartZoom(Math.max(.6, chartZoom - .2))}>−</button><strong>{Math.round(chartZoom * 100)}%</strong><button aria-label="放大图纸" onClick={() => setChartZoom(Math.min(2, chartZoom + .2))}>＋</button></>}
                  {replacementHistory.length > 0 && <button onClick={undoReplacement}>↶ 撤销换色</button>}
                  <button onClick={() => setChartFocus(!chartFocus)}>{chartFocus ? "退出全屏" : "专注查看"}</button>
                </div>
              </div>
              {patternView === "chart" ? (
                <div className="chart-stage">
                  <div className="chart-title"><div><b>{projectDisplayTitle}</b><span>{craftSize} × {craftSize} · 每格均标注品牌色号</span></div><em>每 5 格橙色分区</em></div>
                  <PatternChart cells={displayPattern} size={craftSize} zoom={chartZoom} highlight={replacementPreview ? null : chartHighlight} />
                  <div className="pattern-legend" aria-label="图纸颜色用量">
                    {craftUsage.map((item) => <button key={`${item.brand}-${item.code}`} onClick={() => { setReplacementPreview(null); setHighlight(highlight === item.code ? null : item.code); }} style={{ background: item.color, color: textColor(item.color) }}><b>{item.code}</b><span>{item.brand} · {item.name}</span><strong>{item.count} 颗</strong></button>)}
                  </div>
                </div>
              ) : patternView === "section" ? (
                <div className="chart-stage section-stage">
                  <div className="chart-title"><div><b>分区 {String.fromCharCode(65 + activeSectionRow)}{activeSectionColumn + 1}</b><span>第 {sectionStartRow + 1}–{sectionStartRow + sectionHeight} 行 · 第 {sectionStartColumn + 1}–{sectionStartColumn + sectionWidth} 列</span></div><em>放大逐块拼，不易串行</em></div>
                  <div className="section-navigator" aria-label="选择图纸分区">
                    {Array.from({ length: sectionRowCount * sectionColumnCount }, (_, index) => {
                      const row = Math.floor(index / sectionColumnCount);
                      const column = index % sectionColumnCount;
                      const label = `${String.fromCharCode(65 + row)}${column + 1}`;
                      return <button key={label} className={row === activeSectionRow && column === activeSectionColumn ? "active" : ""} onClick={() => { setSectionRow(row); setSectionColumn(column); }}>{label}<small>{row * 10 + 1}–{Math.min((row + 1) * 10, craftSize)} 行</small></button>;
                    })}
                  </div>
                  <div className="section-chart-wrap">
                    <PatternChart cells={displayPattern} size={craftSize} zoom={1.45} highlight={replacementPreview ? null : chartHighlight} startRow={sectionStartRow} startColumn={sectionStartColumn} rowCount={sectionHeight} columnCount={sectionWidth} />
                  </div>
                  <div className="section-pagination">
                    <button disabled={activeSectionRow === 0 && activeSectionColumn === 0} onClick={() => { const index = activeSectionRow * sectionColumnCount + activeSectionColumn - 1; setSectionRow(Math.floor(index / sectionColumnCount)); setSectionColumn(index % sectionColumnCount); }}>← 上一区</button>
                    <span>{activeSectionRow * sectionColumnCount + activeSectionColumn + 1} / {sectionRowCount * sectionColumnCount}</span>
                    <button disabled={activeSectionRow === sectionRowCount - 1 && activeSectionColumn === sectionColumnCount - 1} onClick={() => { const index = activeSectionRow * sectionColumnCount + activeSectionColumn + 1; setSectionRow(Math.floor(index / sectionColumnCount)); setSectionColumn(index % sectionColumnCount); }}>下一区 →</button>
                  </div>
                </div>
              ) : (
                <div className="preview-stage"><div className="large-art">{selectedPattern ? <GeneratedArtwork cells={displayPattern} size={gridSize} highlight={replacementPreview ? null : previewHighlight} /> : <BeadArtwork highlight={previewHighlight} />}</div><p>{replacementPreview ? `正在预览 ${replacementPreview.fromCode} → ${replacementPreview.toCode}` : "预览用于查看整体成品；制作时请切回高清施工图。"}</p></div>
              )}
              <div className="coordinate-hint">可横向、纵向滚动查看；点击右侧颜色可高亮该色号</div>
            </div>
            <aside className="craft-sidebar panel">
              <div className="progress-head"><div><span>制作进度</span><strong>{actualProgress}%</strong></div><div className="progress-track"><i style={{ width: `${actualProgress}%` }} /></div><p>{completedColors.length} / {generatedUsage.length || 5} 个颜色已完成</p></div>
              <div className="color-tasks">
                {(generatedUsage.length ? generatedUsage.map((item) => ({ key: item.code, ...item })) : [
                  { key: "N2", brand: "MARD", code: "N2", name: "炭黑", count: 68, color: "#35302e" },
                  { key: "C5", brand: "MARD", code: "C5", name: "姜黄色", count: 96, color: "#d89b42" },
                  { key: "M1", brand: "MARD", code: "M1", name: "奶油白", count: 18, color: "#f5eddb" },
                  { key: "M7", brand: "MARD", code: "M7", name: "蜜桃粉", count: 12, color: "#e98d8c" },
                  { key: "A3", brand: "MARD", code: "A3", name: "鼠尾草", count: 31, color: "#91a487" },
                ]).map((item) => {
                  const done = completedColors.includes(item.key);
                  return <button key={`${item.brand}-${item.key}`} className={`${highlight === item.key ? "active" : ""} ${done ? "done" : ""}`} onClick={() => { setReplacementPreview(null); setHighlight(highlight === item.key ? null : item.key); }}><i style={{ background: item.color }} /><span><b>{item.code} · {item.name}</b><small>{item.brand} · {item.count} 颗</small></span><em onClick={(event) => { event.stopPropagation(); setCompletedColors(done ? completedColors.filter((key) => key !== item.key) : [...completedColors, item.key]); }}>{done ? "✓" : "○"}</em></button>;
                })}
              </div>
              {generatedPatterns && highlight && highlightedUsage && <div className="color-replace-panel">
                <div className="replace-head"><div><small>颜色不合适？</small><b>替换 {highlightedUsage.code}</b></div>{replacementHistory.length > 0 && <button onClick={undoReplacement}>↶ 撤销上次</button>}</div>
                <div className="replace-current"><i style={{ background: highlightedUsage.color }} /><span><b>{highlightedUsage.brand} · {highlightedUsage.code}</b><small>当前使用 {highlightedUsage.count} 颗</small></span></div>
                <div className="replace-scope"><button className={replacementScope === "all" ? "active" : ""} onClick={() => { setReplacementScope("all"); setReplacementPreview(null); }}>整张图</button><button className={replacementScope === "section" ? "active" : ""} onClick={() => { setReplacementScope("section"); setReplacementPreview(null); }}>分区 {String.fromCharCode(65 + activeSectionRow)}{activeSectionColumn + 1}</button><span>替换 {replacementNeeded} 格</span></div>
                <div className="replace-brand-switch" aria-label="选择替代品牌">
                  {(["MARD", "Artkal", "Perler", "Hama"] as ReplacementBrand[]).map((brand) => <button key={brand} className={replacementBrand === brand ? "active" : ""} onClick={() => { setReplacementBrand(brand); setReplacementPreview(null); }}><b>{brand}</b><small>{brand === "MARD" ? 291 : crossBrandColors.filter((item) => item.brand === brand).length} 色</small></button>)}
                </div>
                <div className="replacement-options">
                  {replacementOptions.map((option) => <button key={`${option.brand}-${option.code}`} className={replacementPreview?.brand === option.brand && replacementPreview?.toCode === option.code ? "active" : ""} onClick={() => setReplacementPreview({ fromBrand: highlightedUsage.brand, fromCode: highlightedUsage.code, brand: option.brand, toCode: option.code, color: option.color, name: option.name, label: option.label })}>
                    <i style={{ background: option.color }} /><span><em>{option.label} · {option.brand}</em><b>{option.code}</b><small>{option.name} · 近似 {option.similarity}%</small></span><strong className={option.shortage ? "short" : "enough"}>{option.shortage ? `缺 ${option.shortage}` : `可用 ${option.available}`}</strong>
                  </button>)}
                </div>
                {replacementPreview && <div className="replace-confirm"><div><i style={{ background: highlightedUsage.color }} /><span>→</span><i style={{ background: replacementPreview.color }} /><b>{highlightedUsage.brand} {highlightedUsage.code} → {replacementPreview.brand} {replacementPreview.toCode}</b></div><p>这是屏幕参考色近似匹配，不等于实物测色；确认后会重新计算品牌用量和缺货。</p><div><button onClick={() => setReplacementPreview(null)}>取消</button><button className="apply" onClick={applyReplacement}>确认替换 {replacementNeeded} 格</button></div></div>}
              </div>}
              {generatedPatterns && <button className={`batch-summary ${resolvedBatchReplacements.length ? "ready" : "unavailable"}`} onClick={openBatchReplace}>
                <span>⇄</span><div><small>库存优先 · 跨品牌</small><b>{purchaseItems.length ? resolvedBatchReplacements.length ? `可一键替换 ${resolvedBatchReplacements.length} 个缺货色` : "暂未找到足量近似库存" : "当前没有缺货颜色"}</b><p>先预览整批换色，再决定是否应用</p></div><em>智能换色 →</em>
              </button>}
              <button className={`purchase-summary ${purchaseItems.length ? "has-shortage" : "enough"}`} onClick={openShoppingList}>
                <span>{purchaseItems.length ? "袋" : "✓"}</span><div><small>智能采购清单</small><b>{purchaseItems.length ? `缺 ${purchaseItems.length} 个色号 · ${purchaseTotal} 颗` : "当前库存已经足够"}</b><p>已自动扣除可用库存，并保留安全库存</p></div><em>查看 →</em>
              </button>
              <div className="smart-tip"><span>✦</span><div><b>{ignoreStock ? "采购清单模式" : "库存提醒"}</b><p>{ignoreStock ? "缺少的颜色会完整保留，并自动计算需要购买的数量。" : generatedPatterns ? "这张图已经按当前安全库存重新分配颜色。" : "示例图也会根据你的本机库存计算采购缺口。"}</p></div></div>
            </aside>
          </section>
        </div>
      )}

      {showShoppingList && (
        <div className="shopping-backdrop" onMouseDown={() => setShowShoppingList(false)}>
          <section className="shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="shopping-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="shopping-head">
              <div><span className="step-tag">库存自动核算</span><h2 id="shopping-title">智能采购清单</h2><p>图纸用量减去可用库存，安全库存不会被占用。</p></div>
              <button aria-label="关闭采购清单" onClick={() => setShowShoppingList(false)}>×</button>
            </header>
            <div className="shopping-overview">
              <div><small>需要购买</small><strong>{purchaseItems.length}<em> 色</em></strong></div>
              <div><small>合计缺口</small><strong>{purchaseTotal.toLocaleString()}<em> 颗</em></strong></div>
              <div><small>图纸总量</small><strong>{craftPattern.filter(Boolean).length.toLocaleString()}<em> 颗</em></strong></div>
            </div>
            <div className="shopping-note"><span>✦</span><p>缺口按“当前库存 − 安全预留”计算。换色或修改库存后，清单会立即更新。</p></div>
            <div className="shopping-list">
              {purchaseGroups.length ? purchaseGroups.map((group) => (
                <div className="shopping-brand-group" key={group.brand}>
                  <div className="shopping-brand-head"><div><b>{group.brand}</b><span>{group.items.length} 个色号 · 共 {group.items.reduce((sum, item) => sum + item.shortage, 0)} 颗</span></div><button onClick={() => { const groupKeys = group.items.map((item) => `${item.brand}::${item.code}`); const allSelected = groupKeys.every((key) => selectedPurchaseKeys.includes(key)); setSelectedPurchaseKeys((keys) => allSelected ? keys.filter((key) => !groupKeys.includes(key)) : [...new Set([...keys, ...groupKeys])]); }}>{group.items.every((item) => selectedPurchaseKeys.includes(`${item.brand}::${item.code}`)) ? "取消全选" : "全选"}</button></div>
                  {group.items.map((item) => {
                    const purchaseKey = `${group.brand}::${item.code}`;
                    const selected = selectedPurchaseKeys.includes(purchaseKey);
                    return (
                    <div className={`shopping-row ${selected ? "selected" : ""}`} key={`${group.brand}-${item.code}`}>
                      <button className="purchase-check" aria-label={`${selected ? "取消选择" : "选择"} ${group.brand} ${item.code}`} aria-pressed={selected} onClick={() => togglePurchaseItem(purchaseKey)} style={{ "--purchase-color": item.color } as CSSProperties}><span>{selected ? "✓" : ""}</span></button>
                      <div className="shopping-color"><b>{item.code}</b><span>{item.name}</span></div>
                      <div><small>图纸</small><strong>{item.count}</strong></div>
                      <div><small>库存</small><strong>{item.current}</strong></div>
                      <div><small>预留</small><strong>{item.safe}</strong></div>
                      <div className="shopping-shortage"><small>建议购买</small><strong>+{item.shortage}</strong></div>
                    </div>
                  );})}
                </div>
              )) : (
                <div className="shopping-empty"><span>✓</span><h3>这套图纸不用补货</h3><p>所有色号在保留安全库存后仍然足够。</p></div>
              )}
            </div>
            <footer className="shopping-footer"><button onClick={() => setShowShoppingList(false)}>返回图纸</button><button onClick={exportShoppingList} disabled={!purchaseItems.length}>导出 CSV</button><button onClick={copyShoppingList} disabled={!purchaseItems.length}>复制清单</button><button className="receive-list" onClick={receivePurchasedItems} disabled={!selectedPurchaseItems.length}>已购入库 · {selectedPurchaseTotal} 颗</button></footer>
          </section>
        </div>
      )}

      {showBatchReplace && (
        <div className="shopping-backdrop" onMouseDown={() => setShowBatchReplace(false)}>
          <section className="shopping-dialog batch-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="shopping-head">
              <div><span className="step-tag">库存优先 · 跨品牌</span><h2 id="batch-title">一键替换缺货颜色</h2><p>仅使用扣除安全预留和当前图纸占用后，数量仍然足够的库存色。</p></div>
              <button aria-label="关闭批量换色" onClick={() => setShowBatchReplace(false)}>×</button>
            </header>
            <div className="batch-tolerance">
              <div><b>颜色接近程度</b><span>阈值越高，颜色越接近，但可替换数量可能更少。</span></div>
              <div>{[{ value: 85, label: "严格" }, { value: 75, label: "平衡" }, { value: 65, label: "宽松" }].map((item) => <button key={item.value} className={batchSimilarity === item.value ? "active" : ""} onClick={() => setBatchSimilarity(item.value)}>{item.label}<small>≥ {item.value}%</small></button>)}</div>
            </div>
            <div className="shopping-overview batch-overview">
              <div><small>缺货色号</small><strong>{purchaseItems.length}<em> 色</em></strong></div>
              <div><small>可整组替换</small><strong>{resolvedBatchReplacements.length}<em> 色</em></strong></div>
              <div><small>预计减少缺口</small><strong>{batchResolvedShortage.toLocaleString()}<em> 颗</em></strong></div>
            </div>
            <div className="shopping-note batch-note"><span>!</span><p>为保持图纸颜色一致，每个缺货色会整组替换，而不是只替换缺少的几颗；本次预计改动 {batchChangedCells.toLocaleString()} 格。</p></div>
            <div className="shopping-list batch-list">
              {batchReplacementPlan.length ? batchReplacementPlan.map(({ source, target }) => (
                <div className={`batch-row ${target ? "resolved" : "unresolved"}`} key={`${source.brand}-${source.code}`}>
                  <div className="batch-color"><i style={{ background: source.color }} /><span><small>原色 · 缺 {source.shortage}</small><b>{source.brand} {source.code}</b><em>{source.name}</em></span></div>
                  <span className="batch-arrow">→</span>
                  {target ? <div className="batch-color target"><i style={{ background: target.color }} /><span><small>库存可用 {target.available}</small><b>{target.brand} {target.code}</b><em>{target.name}</em></span></div> : <div className="batch-no-match"><b>保留原色</b><span>没有数量足够且达到 {batchSimilarity}% 的库存色</span></div>}
                  <div className={`batch-score ${target ? "good" : "none"}`}><small>屏幕近似</small><strong>{target ? `${target.similarity}%` : "—"}</strong></div>
                </div>
              )) : <div className="shopping-empty"><span>✓</span><h3>当前没有缺货颜色</h3><p>无需批量替换，可以直接开始制作。</p></div>}
            </div>
            <footer className="shopping-footer batch-footer"><button onClick={() => setShowBatchReplace(false)}>取消</button><button className="receive-list" onClick={applyBatchReplacements} disabled={!resolvedBatchReplacements.length}>应用 {resolvedBatchReplacements.length} 个替换</button></footer>
          </section>
        </div>
      )}

      {showProjects && (
        <div className="shopping-backdrop" onMouseDown={() => setShowProjects(false)}>
          <section className="shopping-dialog projects-dialog" role="dialog" aria-modal="true" aria-labelledby="projects-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="shopping-head">
              <div><span className="step-tag">仅保存在当前设备</span><h2 id="projects-title">我的作品</h2><p>自动保存最近 5 个图纸，包括换色结果和制作进度。</p></div>
              <button aria-label="关闭作品列表" onClick={() => setShowProjects(false)}>×</button>
            </header>
            <div className="projects-local-note"><span>✓</span><p>无需登录云端；清除浏览器数据或更换设备后，这里的作品不会自动迁移。</p></div>
            <div className="projects-list">
              {savedProjects.length ? savedProjects.map((project) => {
                const progressValue = project.projectCompleted ? 100 : project.palette.length ? Math.min(100, Math.round((project.completedColors?.length ?? 0) / project.palette.length * 100)) : 0;
                return (
                  <article className={`project-card ${activeProjectId === project.id ? "active" : ""}`} key={project.id}>
                    <div className="project-thumbnail" aria-hidden="true">{(project.preview ?? []).map((color, index) => <i key={index} style={{ background: color }} />)}</div>
                    <div className="project-info">
                      <div className="project-title-row"><input aria-label="作品名称" value={project.title} onChange={(event) => renameProject(project.id, event.target.value)} onBlur={() => { if (!project.title.trim()) renameProject(project.id, "未命名作品"); }} /><span>{activeProjectId === project.id ? "当前" : project.projectCompleted ? "已完成" : "自动保存"}</span></div>
                      <p>{project.size} × {project.size} · {project.beadCount.toLocaleString()} 颗 · {project.palette.length} 色</p>
                      <div className="project-progress"><i style={{ width: `${progressValue}%` }} /><span>{progressValue}%</span></div>
                      <small>更新于 {new Date(project.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                    </div>
                    <div className="project-actions"><button onClick={() => restoreProject(project)}>{activeProjectId === project.id ? "返回制作" : "继续制作"}</button><button className="delete" onClick={() => deleteProject(project.id)}>删除</button></div>
                  </article>
                );
              }) : <div className="projects-empty"><span>▦</span><h3>还没有保存的作品</h3><p>生成第一张图纸后，豆仓会自动开始保存。</p></div>}
            </div>
            <footer className="shopping-footer projects-footer"><button onClick={() => setShowProjects(false)}>关闭</button><button className="receive-list" onClick={startNewProject}>＋ 新建作品</button></footer>
          </section>
        </div>
      )}

      <PrintPatternBook cells={craftPattern} size={craftSize} usage={craftUsage} title={projectDisplayTitle} />

      <nav className="mobile-nav" aria-label="移动端导航">
        <button className={screen === "home" ? "active" : ""} onClick={() => go("home")}><span>⌂</span>首页</button>
        <button className={screen === "inventory" ? "active" : ""} onClick={() => go("inventory")}><span>◫</span>豆仓</button>
        <button className="mobile-create" onClick={() => go("create")}><span>＋</span></button>
        <button className={screen === "craft" ? "active" : ""} onClick={() => go("craft")}><span>▦</span>制作</button>
        <button className={screen === "catalog" ? "active" : ""} onClick={() => go("catalog")}><span>◉</span>色库</button>
      </nav>
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
