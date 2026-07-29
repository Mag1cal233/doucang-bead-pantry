"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { crossBrandColors, type CrossBrandName } from "./brand-colors";
import { mardColors, mardSeries } from "./mard-colors";

type Screen = "home" | "inventory" | "catalog" | "create" | "plans" | "craft";
type Strategy = "zero" | "balance" | "quality";
type GeneratedCell = { brand?: string; code: string; color: string; name?: string } | null;
type GeneratedPatterns = Record<Strategy, GeneratedCell[]>;
type PatternView = "chart" | "section" | "preview";
type ColorShift = "original" | "warm" | "cool" | "bright" | "soft";
type ImageFit = "cover" | "contain";
type ImageSampling = "smooth" | "pixel";
type RgbColor = { r: number; g: number; b: number };
type PreparedPatternPixels = { pixels: Array<RgbColor | null>; importance: Float32Array };
type PlanMetrics = { match: number; stock: number; shortage: number; colors: number; beads: number; unfilled: number; time: string };
type CellEditTool = "paint" | "erase" | "pick" | "fill" | "select";
type CellSelection = { start: number; end: number | null };
type UsageItem = { brand: string; code: string; color: string; count: number; name: string };
type Swatch = { brand: string; code: string; name: string; color: string; count: number; safe: number };
type ReplacementScope = "all" | "section";
type ReplacementBrand = "MARD" | CrossBrandName;
type InventoryFilter = "all" | "low" | "preferred";
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
  { name: "Artkal", origin: "国际品牌", series: "A · C · M · R · S", coverage: "5 个常用系列 · 781 项开源参考色", state: "已建档", tone: "#cb7d5a" },
  { name: "Perler", origin: "国际品牌", series: "Classic · Mini · Caps", coverage: "3 个系列 · 170 项开源参考色", state: "已建档", tone: "#d5a13b" },
  { name: "Hama", origin: "国际品牌", series: "Mini · Midi · Maxi", coverage: "3 个系列 · 195 项开源参考色", state: "已建档", tone: "#739a9c" },
  { name: "Nabbi", origin: "国际品牌", series: "Midi 5 mm", coverage: "30 项开源参考色", state: "已建档", tone: "#8c779d" },
  { name: "Yant", origin: "国内常用", series: "5 mm", coverage: "119 项开源参考色", state: "已建档", tone: "#b66b70" },
  { name: "PhotoPearls", origin: "国际品牌", series: "5 mm", coverage: "官方 1–42 色号 · 屏幕色待校准", state: "色号资料", tone: "#6888a0" },
  { name: "COCO 可可", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "常用套装与单色", state: "待复核", tone: "#9c745c" },
  { name: "漫漫", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#708c72" },
  { name: "盼盼拼豆", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#bf7658" },
  { name: "卡卡家", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#687f98" },
];

const replacementBrands: ReplacementBrand[] = ["MARD", "Artkal", "Perler", "Hama", "Nabbi", "Yant"];

function colorKey(brand: string, code: string) {
  return `${brand}::${code}`;
}

function sameGeneratedCell(a: GeneratedCell, b: GeneratedCell) {
  if (!a || !b) return a === b;
  return (a.brand ?? "MARD") === (b.brand ?? "MARD") && a.code === b.code && a.color === b.color;
}

function rectangleIndexes(start: number, end: number, size: number) {
  const startRow = Math.floor(start / size);
  const startColumn = start % size;
  const endRow = Math.floor(end / size);
  const endColumn = end % size;
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minColumn = Math.min(startColumn, endColumn);
  const maxColumn = Math.max(startColumn, endColumn);
  const indexes: number[] = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) indexes.push(row * size + column);
  }
  return indexes;
}

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

type InspirationTemplate = {
  id: string;
  title: string;
  category: string;
  size: number;
  colors: number;
  background: string;
  palette: Record<string, string>;
  pattern: string[];
};

const inspirationTemplates: InspirationTemplate[] = [
  {
    id: "berry-heart",
    title: "莓果爱心",
    category: "小挂件",
    size: 29,
    colors: 8,
    background: "#fff0f6",
    palette: { r: "#ef5f98" },
    pattern: ["...........", "..rr...rr..", ".rrrr.rrrr.", "rrrrrrrrrrr", "rrrrrrrrrrr", ".rrrrrrrrr.", "..rrrrrrr..", "...rrrrr...", "....rrr....", ".....r.....", "..........."],
  },
  {
    id: "peach-flower",
    title: "桃气小花",
    category: "植物",
    size: 29,
    colors: 12,
    background: "#fff6e8",
    palette: { p: "#f58aaa", y: "#ffd667", g: "#72c69b" },
    pattern: ["....ppp....", "...ppppp...", "..pppyppp..", "...pyyyp...", "....yyy....", "....ggg....", "...ggg.....", "..g.ggg.g..", ".gg..g..gg.", "...ggggg...", "..........."],
  },
  {
    id: "picnic-mushroom",
    title: "野餐蘑菇",
    category: "卡通",
    size: 29,
    colors: 16,
    background: "#fff3ed",
    palette: { r: "#ed6b6b", w: "#fff6ed", b: "#c99768" },
    pattern: ["...rrrrr...", "..rrrrrrr..", ".rrwrrrwrr.", "rrrrrrrrrrr", ".rrrrrrrrr.", "...bbbbb...", "...bwbwb...", "...bbbbb...", "....bbb....", "...bbbbb...", "..........."],
  },
  {
    id: "lemon-duck",
    title: "柠檬小鸭",
    category: "动物",
    size: 58,
    colors: 24,
    background: "#fff9df",
    palette: { y: "#ffd75a", n: "#493e3c", o: "#f49a4a" },
    pattern: ["...........", "...yyyy....", "..yyyyyy...", "..ynyyyn...", "..yyyyyyoo.", "...yyyyoo..", "...yyyy....", "..yyyyyy...", "..y....y...", ".yy....yy..", "..........."],
  },
  {
    id: "cherry-pair",
    title: "樱桃搭档",
    category: "食物",
    size: 29,
    colors: 12,
    background: "#effaf2",
    palette: { r: "#df4165", g: "#59a978" },
    pattern: ["....gg.....", "...gggg....", "..gg..gg...", "..g....g...", ".rr....rr..", "rrrr..rrrr.", "rrrr..rrrr.", ".rr....rr..", "...........", "...........", "..........."],
  },
  {
    id: "violet-planet",
    title: "紫藤星球",
    category: "星空",
    size: 58,
    colors: 32,
    background: "#f1efff",
    palette: { p: "#8064da", b: "#9bc7ed", r: "#ef8fc2" },
    pattern: ["....ppp....", "..ppbbpp...", ".pbbbbbp...", "pbbbbbbbbp.", "pbbbbbbbbbp", ".pbbbbbbbp.", "..pbbbbbp..", "rrrpppprrrr", ".rrrrrrrrr.", "...rrrrr...", "..........."],
  },
];

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
    note: "严格按照当前可用库存配色，不额外增加采购量。",
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
    note: "在库存基础上允许少量补色，兼顾细节和采购量。",
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
    note: "从完整色库中匹配，优先保留轮廓、光影和细节。",
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

function MiniPixelArtwork({ template }: { template: InspirationTemplate }) {
  return (
    <div
      className="mini-pixel-art"
      style={{ gridTemplateColumns: `repeat(${template.pattern[0].length}, 1fr)` }}
      role="img"
      aria-label={`${template.title}拼豆示例`}
    >
      {template.pattern.flatMap((row, rowIndex) =>
        [...row].map((value, columnIndex) => (
          <i
            key={`${template.id}-${rowIndex}-${columnIndex}`}
            className={value === "." ? "is-empty" : ""}
            style={{ "--mini-color": template.palette[value] ?? "transparent" } as CSSProperties}
          />
        )),
      )}
    </div>
  );
}

function usePinchZoom(viewportRef: { current: HTMLElement | null }, zoom: number, onZoomChange: ((value: number) => void) | undefined, minimum: number, maximum: number, resetZoom = 1) {
  const zoomRef = useRef(zoom);
  const gestureRef = useRef({ active: false, distance: 0, zoom: 1, contentX: 0, contentY: 0 });
  const lastTapRef = useRef(0);
  const tapRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !onZoomChange) return;
    const distanceBetween = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const midpoint = (touches: TouchList) => ({ x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 });

    const start = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        tapRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, moved: false };
        return;
      }
      if (event.touches.length !== 2) return;
      const rect = viewport.getBoundingClientRect();
      const center = midpoint(event.touches);
      const localX = center.x - rect.left;
      const localY = center.y - rect.top;
      gestureRef.current = {
        active: true,
        distance: Math.max(1, distanceBetween(event.touches)),
        zoom: zoomRef.current,
        contentX: (viewport.scrollLeft + localX) / zoomRef.current,
        contentY: (viewport.scrollTop + localY) / zoomRef.current,
      };
      tapRef.current.moved = true;
      lastTapRef.current = 0;
    };

    const move = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      if (!gesture.active && event.touches.length === 1) {
        const distance = Math.hypot(event.touches[0].clientX - tapRef.current.x, event.touches[0].clientY - tapRef.current.y);
        if (distance > 10) tapRef.current.moved = true;
        return;
      }
      if (!gesture.active || event.touches.length !== 2) return;
      event.preventDefault();
      const ratio = distanceBetween(event.touches) / gesture.distance;
      const nextZoom = Math.max(minimum, Math.min(maximum, Math.round(gesture.zoom * ratio * 20) / 20));
      const rect = viewport.getBoundingClientRect();
      const center = midpoint(event.touches);
      const localX = center.x - rect.left;
      const localY = center.y - rect.top;
      onZoomChange(nextZoom);
      window.requestAnimationFrame(() => {
        viewport.scrollLeft = gesture.contentX * nextZoom - localX;
        viewport.scrollTop = gesture.contentY * nextZoom - localY;
      });
    };

    const end = (event: TouchEvent) => {
      if (gestureRef.current.active) {
        if (event.touches.length < 2) gestureRef.current.active = false;
        lastTapRef.current = 0;
        return;
      }
      if (event.touches.length || tapRef.current.moved) return;
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        onZoomChange(resetZoom);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    };

    viewport.addEventListener("touchstart", start, { passive: true });
    viewport.addEventListener("touchmove", move, { passive: false });
    viewport.addEventListener("touchend", end, { passive: true });
    viewport.addEventListener("touchcancel", end, { passive: true });
    return () => {
      viewport.removeEventListener("touchstart", start);
      viewport.removeEventListener("touchmove", move);
      viewport.removeEventListener("touchend", end);
      viewport.removeEventListener("touchcancel", end);
    };
  }, [maximum, minimum, onZoomChange, resetZoom, viewportRef]);
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

function PatternOverview({ cells, size, zoom, highlight }: { cells: GeneratedCell[]; size: number; zoom: number; highlight?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseSize = Math.min(720, Math.max(360, size * 8));
  const renderedSize = Math.round(baseSize * zoom);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const cellPixels = 10;
    const canvasSize = size * cellPixels;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    context.clearRect(0, 0, canvasSize, canvasSize);
    context.fillStyle = "#fffefa";
    context.fillRect(0, 0, canvasSize, canvasSize);

    cells.forEach((cell, index) => {
      if (!cell) return;
      const row = Math.floor(index / size);
      const column = index % size;
      context.globalAlpha = highlight && cell.code !== highlight ? .12 : 1;
      context.fillStyle = cell.color;
      context.fillRect(column * cellPixels, row * cellPixels, cellPixels, cellPixels);
    });
    context.globalAlpha = 1;

    if (zoom >= 1.25) {
      context.lineWidth = 1;
      for (let index = 0; index <= size; index += 1) {
        const position = index * cellPixels + .5;
        context.strokeStyle = index % 5 === 0 ? "rgba(196, 119, 51, .72)" : "rgba(54, 52, 47, .2)";
        context.beginPath();
        context.moveTo(position, 0);
        context.lineTo(position, canvasSize);
        context.stroke();
        context.beginPath();
        context.moveTo(0, position);
        context.lineTo(canvasSize, position);
        context.stroke();
      }
    }
  }, [cells, highlight, size, zoom]);

  return (
    <canvas
      ref={canvasRef}
      className="pattern-overview"
      style={{ width: `${renderedSize}px`, height: `${renderedSize}px` }}
      role="img"
      aria-label={`${size}×${size} 图纸总览，可放大缩小查看`}
    />
  );
}

function textColor(background: string) {
  const { r, g, b } = hexToRgb(background);
  return (r * 299 + g * 587 + b * 114) / 1000 > 154 ? "#27251f" : "#ffffff";
}

function PatternChart({ cells, size, zoom, highlight, startRow = 0, startColumn = 0, rowCount = size, columnCount = size, editable = false, dragEditable = false, selectedIndexes, onCellEdit, onCellStrokeStart, onCellStrokeMove, onCellStrokeEnd, onZoomChange }: { cells: GeneratedCell[]; size: number; zoom: number; highlight?: string | null; startRow?: number; startColumn?: number; rowCount?: number; columnCount?: number; editable?: boolean; dragEditable?: boolean; selectedIndexes?: Set<number>; onCellEdit?: (index: number, cell: GeneratedCell) => void; onCellStrokeStart?: (index: number, cell: GeneratedCell) => void; onCellStrokeMove?: (index: number, cell: GeneratedCell) => void; onCellStrokeEnd?: () => void; onZoomChange?: (zoom: number) => void }) {
  const cellSize = Math.round(30 * zoom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const draggedIndexesRef = useRef(new Set<number>());
  const suppressClickRef = useRef(false);
  usePinchZoom(scrollRef, zoom, onZoomChange, .6, 2, 1);

  useEffect(() => {
    const finishStroke = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      draggedIndexesRef.current.clear();
      onCellStrokeEnd?.();
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    };
    window.addEventListener("pointerup", finishStroke);
    window.addEventListener("pointercancel", finishStroke);
    return () => {
      window.removeEventListener("pointerup", finishStroke);
      window.removeEventListener("pointercancel", finishStroke);
    };
  }, [onCellStrokeEnd]);

  return (
    <div ref={scrollRef} className={`chart-scroll ${onZoomChange ? "touch-zoom-viewport" : ""}`} aria-label={`${rowCount}乘${columnCount}高清带色号施工图`}>
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
              const cellIndex = (absoluteRow - 1) * size + absoluteColumn - 1;
              const cell = cells[cellIndex];
              const dimmed = Boolean(cell && highlight && cell.code !== highlight);
              return (
                <span
                  className={`chart-cell ${(absoluteColumn % 5 === 0) ? "major-x" : ""} ${(absoluteRow % 5 === 0) ? "major-y" : ""} ${dimmed ? "dimmed" : ""} ${selectedIndexes?.has(cellIndex) ? "selected-cell" : ""} ${editable ? "editable" : ""} ${dragEditable ? "drag-editable" : ""}`}
                  key={column}
                  style={cell ? { background: cell.color, color: textColor(cell.color) } : undefined}
                  title={cell ? `${absoluteRow} 行 ${absoluteColumn} 列 · ${cell.code}${editable ? " · 点击修图" : ""}` : `${absoluteRow} 行 ${absoluteColumn} 列 · 留空${editable ? " · 点击修图" : ""}`}
                  role={editable ? "button" : undefined}
                  tabIndex={editable ? 0 : undefined}
                  onPointerDown={editable && dragEditable ? (event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    draggingRef.current = true;
                    draggedIndexesRef.current = new Set([cellIndex]);
                    suppressClickRef.current = true;
                    onCellStrokeStart?.(cellIndex, cell);
                  } : undefined}
                  onPointerEnter={editable && dragEditable ? (event) => {
                    if (!draggingRef.current || event.buttons !== 1 || draggedIndexesRef.current.has(cellIndex)) return;
                    draggedIndexesRef.current.add(cellIndex);
                    onCellStrokeMove?.(cellIndex, cell);
                  } : undefined}
                  onClick={editable ? () => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    onCellEdit?.(cellIndex, cell);
                  } : undefined}
                  onKeyDown={editable ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCellEdit?.(cellIndex, cell);
                    }
                  } : undefined}
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
              <div><small>一粒画 · 高清分区施工图</small><h1>{title}</h1><p>{size} × {size} · 共 {cells.filter(Boolean).length} 颗 · 10×10 自动分页</p></div>
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

function measurePixelImportance(pixels: Array<RgbColor | null>, size: number) {
  const importance = new Float32Array(pixels.length);
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  pixels.forEach((pixel, index) => {
    if (!pixel) return;
    const row = Math.floor(index / size);
    const column = index % size;
    let contrast = 0;
    let neighbors = 0;
    offsets.forEach(([rowOffset, columnOffset]) => {
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) return;
      const neighbor = pixels[nextRow * size + nextColumn];
      if (!neighbor) return;
      contrast += Math.sqrt(perceptualDistance(pixel, neighbor));
      neighbors += 1;
    });
    const maximum = Math.max(pixel.r, pixel.g, pixel.b);
    const minimum = Math.min(pixel.r, pixel.g, pixel.b);
    const saturation = maximum ? (maximum - minimum) / maximum : 0;
    const edgeWeight = neighbors ? Math.min(2.6, contrast / neighbors / 52) : 0;
    importance[index] = 1 + edgeWeight + saturation * .35;
  });

  return importance;
}

function selectUsefulPaletteIndexes(pixels: Array<RgbColor | null>, importance: Float32Array, paletteRgb: RgbColor[], colorLimit: number) {
  const hits = new Uint32Array(paletteRgb.length);
  const demand = new Float64Array(paletteRgb.length);

  pixels.forEach((pixel, pixelIndex) => {
    if (!pixel) return;
    let nearestIndex = 0;
    let nearestCost = Infinity;
    paletteRgb.forEach((paletteColor, paletteIndex) => {
      const cost = perceptualDistance(pixel, paletteColor);
      if (cost < nearestCost) {
        nearestIndex = paletteIndex;
        nearestCost = cost;
      }
    });
    hits[nearestIndex] += 1;
    demand[nearestIndex] += importance[pixelIndex] || 1;
  });

  const activeIndexes = paletteRgb
    .map((_, index) => index)
    .filter((index) => hits[index] > 0)
    .sort((a, b) => demand[b] - demand[a]);
  if (activeIndexes.length <= colorLimit) return new Set(activeIndexes);

  // Dominant colors keep most slots; distinct edge and accent colors compete
  // for the rest, preserving details such as eyes, outlines, and highlights.
  const mainSlots = Math.max(1, Math.min(colorLimit, Math.ceil(colorLimit * .65)));
  const selected = new Set(activeIndexes.slice(0, mainSlots));

  while (selected.size < colorLimit) {
    let bestIndex = -1;
    let bestScore = -1;
    activeIndexes.forEach((candidateIndex) => {
      if (selected.has(candidateIndex)) return;
      let nearestSelectedDistance = Infinity;
      selected.forEach((selectedIndex) => {
        nearestSelectedDistance = Math.min(nearestSelectedDistance, perceptualDistance(paletteRgb[candidateIndex], paletteRgb[selectedIndex]));
      });
      const averageImportance = demand[candidateIndex] / Math.max(1, hits[candidateIndex]);
      const diversity = 1 + Math.min(5, Math.sqrt(nearestSelectedDistance) / 85);
      const score = Math.sqrt(demand[candidateIndex]) * diversity * (1 + Math.max(0, averageImportance - 1) * .16);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    });
    if (bestIndex < 0) break;
    selected.add(bestIndex);
  }

  return selected;
}

function findNearestPaletteCandidates(pixel: RgbColor, paletteRgb: RgbColor[], candidateLimit: number) {
  const nearest: Array<{ paletteIndex: number; cost: number }> = [];
  paletteRgb.forEach((paletteColor, paletteIndex) => {
    const candidate = { paletteIndex, cost: perceptualDistance(pixel, paletteColor) };
    const insertionIndex = nearest.findIndex((item) => candidate.cost < item.cost);
    if (insertionIndex >= 0) nearest.splice(insertionIndex, 0, candidate);
    else if (nearest.length < candidateLimit) nearest.push(candidate);
    if (nearest.length > candidateLimit) nearest.pop();
  });
  return nearest;
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

function removeSpeckles(cells: GeneratedCell[], size: number, maxComponentSize = 2) {
  const next = cells.map((cell) => cell ? { ...cell } : null);
  const changedIndexes = new Set<number>();
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  for (let pass = 0; pass < 2; pass += 1) {
    const source = next.slice();
    const visited = new Uint8Array(source.length);
    let passChanged = 0;

    for (let start = 0; start < source.length; start += 1) {
      const startCell = source[start];
      if (!startCell || visited[start]) continue;
      const sourceKey = colorKey(startCell.brand ?? "MARD", startCell.code);
      const component: number[] = [];
      const queue = [start];
      visited[start] = 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor];
        component.push(index);
        const row = Math.floor(index / size);
        const column = index % size;
        offsets.forEach(([rowOffset, columnOffset]) => {
          const nextRow = row + rowOffset;
          const nextColumn = column + columnOffset;
          if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) return;
          const neighborIndex = nextRow * size + nextColumn;
          const neighbor = source[neighborIndex];
          if (!neighbor || visited[neighborIndex] || colorKey(neighbor.brand ?? "MARD", neighbor.code) !== sourceKey) return;
          visited[neighborIndex] = 1;
          queue.push(neighborIndex);
        });
      }

      if (component.length > maxComponentSize) continue;
      const componentSet = new Set(component);
      const neighbors = new Map<string, { cell: NonNullable<GeneratedCell>; touches: number }>();
      component.forEach((index) => {
        const row = Math.floor(index / size);
        const column = index % size;
        offsets.forEach(([rowOffset, columnOffset]) => {
          const nextRow = row + rowOffset;
          const nextColumn = column + columnOffset;
          if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) return;
          const neighborIndex = nextRow * size + nextColumn;
          if (componentSet.has(neighborIndex)) return;
          const neighbor = source[neighborIndex];
          if (!neighbor) return;
          const key = colorKey(neighbor.brand ?? "MARD", neighbor.code);
          const current = neighbors.get(key);
          neighbors.set(key, { cell: neighbor, touches: (current?.touches ?? 0) + 1 });
        });
      });

      const target = [...neighbors.values()].sort((a, b) => {
        if (b.touches !== a.touches) return b.touches - a.touches;
        return perceptualDistance(hexToRgb(startCell.color), hexToRgb(a.cell.color)) - perceptualDistance(hexToRgb(startCell.color), hexToRgb(b.cell.color));
      })[0]?.cell;
      if (!target) continue;

      component.forEach((index) => {
        next[index] = { ...target };
        changedIndexes.add(index);
        passChanged += 1;
      });
    }

    if (!passChanged) break;
  }

  return { cells: next, changed: changedIndexes.size };
}

async function preparePatternPixels(imageUrl: string, size: number, colorShift: ColorShift, imageFit: ImageFit, imageSampling: ImageSampling): Promise<PreparedPatternPixels> {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("无法读取图片");

  context.imageSmoothingEnabled = imageSampling === "smooth";
  context.imageSmoothingQuality = "high";
  const scale = imageFit === "contain"
    ? Math.min(size / image.naturalWidth, size / image.naturalHeight)
    : Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

  const data = context.getImageData(0, 0, size, size).data;
  const pixels = Array.from({ length: size * size }, (_, index): RgbColor | null => {
    const offset = index * 4;
    const alpha = data[offset + 3] / 255;
    if (alpha < .25) return null;
    const pixel = alpha < .98
      ? {
          r: Math.round(data[offset] * alpha + 255 * (1 - alpha)),
          g: Math.round(data[offset + 1] * alpha + 255 * (1 - alpha)),
          b: Math.round(data[offset + 2] * alpha + 255 * (1 - alpha)),
        }
      : { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
    return applyColorShift(pixel, colorShift);
  });
  return { pixels, importance: measurePixelImportance(pixels, size) };
}

function generatePattern(prepared: PreparedPatternPixels, strategy: Strategy, ignoreStock: boolean, inventory: Swatch[], maxColors: number, selectedColorKeys: string[], preferredColorKeys: string[]): GeneratedCell[] {
  const { pixels, importance } = prepared;
  const allowedColors = new Set(selectedColorKeys);
  const preferredColors = new Set(preferredColorKeys);
  const stockColors = inventory
    .filter((item) => !allowedColors.size || allowedColors.has(colorKey(item.brand, item.code)))
    .map((item) => ({ ...item, limit: ignoreStock ? Infinity : Math.max(0, item.count - item.safe) }));
  const fullColors = allowedColors.size
    ? stockColors.map((item) => ({ ...item, limit: Infinity }))
    : mardColors.map((item) => ({ brand: "MARD", code: item.code, color: item.hex, name: "MARD 公开参考色", count: 0, safe: 0, limit: Infinity }));
  let palette = (strategy === "quality"
    ? fullColors
    : strategy === "balance"
      ? stockColors.map((item) => ({ ...item, limit: ignoreStock ? Infinity : item.limit + 35 }))
      : stockColors).filter((item) => item.limit > 0);

  if (!palette.length) throw new Error("没有可用于生成图纸的颜色");

  const colorLimit = Math.max(3, Math.min(264, maxColors));
  if (palette.length > colorLimit) {
    const selectedIndexes = selectUsefulPaletteIndexes(pixels, importance, palette.map((item) => hexToRgb(item.color)), colorLimit);
    const preferredIndexes = palette
      .map((item, paletteIndex) => ({ paletteIndex, preferred: preferredColors.has(colorKey(item.brand ?? "MARD", item.code)) }))
      .filter((item) => item.preferred)
      .slice(0, colorLimit)
      .map((item) => item.paletteIndex);
    preferredIndexes.forEach((paletteIndex) => selectedIndexes.add(paletteIndex));
    if (selectedIndexes.size > colorLimit) {
      [...selectedIndexes]
        .filter((paletteIndex) => !preferredIndexes.includes(paletteIndex))
        .slice(0, selectedIndexes.size - colorLimit)
        .forEach((paletteIndex) => selectedIndexes.delete(paletteIndex));
    }
    palette = palette.filter((_, paletteIndex) => selectedIndexes.has(paletteIndex));
  }
  const paletteRgb = palette.map((item) => hexToRgb(item.color));
  const hasStockLimits = palette.some((item) => Number.isFinite(item.limit));
  const candidateLimit = Math.min(palette.length, hasStockLimits ? 10 : 2);
  const candidateCache = new Map<number, Array<{ paletteIndex: number; cost: number }>>();
  const candidates = pixels.map((pixel) => {
    if (!pixel) return [];
    const key = (pixel.r << 16) | (pixel.g << 8) | pixel.b;
    const cached = candidateCache.get(key);
    if (cached) return cached;
    const nearest = findNearestPaletteCandidates(pixel, paletteRgb, candidateLimit)
      .map((candidate) => ({
        ...candidate,
        cost: candidate.cost * (preferredColors.has(colorKey(palette[candidate.paletteIndex].brand ?? "MARD", palette[candidate.paletteIndex].code)) ? .88 : 1),
      }))
      .sort((a, b) => a.cost - b.cost);
    candidateCache.set(key, nearest);
    return nearest;
  });
  const priority = pixels
    .map((pixel, index) => ({ index, regret: pixel ? ((candidates[index][1]?.cost ?? candidates[index][0].cost) - candidates[index][0].cost) * (importance[index] || 1) : -1 }))
    .filter((item) => item.regret >= 0)
    .sort((a, b) => b.regret - a.regret);
  const remaining = palette.map((item) => item.limit);
  const result: GeneratedCell[] = Array(pixels.length).fill(null);

  for (const item of priority) {
    let choice = candidates[item.index].find((candidate) => remaining[candidate.paletteIndex] > 0);
    if (!choice) {
      const pixel = pixels[item.index];
      if (!pixel) continue;
      let fallbackIndex = -1;
      let fallbackCost = Infinity;
      paletteRgb.forEach((paletteColor, paletteIndex) => {
        if (remaining[paletteIndex] <= 0) return;
        const paletteItem = palette[paletteIndex];
        const cost = perceptualDistance(pixel, paletteColor) * (preferredColors.has(colorKey(paletteItem.brand ?? "MARD", paletteItem.code)) ? .88 : 1);
        if (cost < fallbackCost) {
          fallbackIndex = paletteIndex;
          fallbackCost = cost;
        }
      });
      if (fallbackIndex < 0) continue;
      choice = { paletteIndex: fallbackIndex, cost: fallbackCost };
    }
    const selected = palette[choice.paletteIndex];
    result[item.index] = { brand: selected.brand ?? "MARD", code: selected.code, color: selected.color, name: selected.name };
    if (Number.isFinite(remaining[choice.paletteIndex])) remaining[choice.paletteIndex] -= 1;
  }
  return result;
}

function estimateMakingTime(beadCount: number) {
  if (!beadCount) return "暂无用豆";
  const minutes = Math.max(10, Math.round((beadCount / 220 * 60) / 5) * 5);
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const hours = minutes / 60;
  return `约 ${hours < 10 ? Math.round(hours * 2) / 2 : Math.round(hours)} 小时`;
}

function calculatePlanMetrics(cells: GeneratedCell[], reference: PreparedPatternPixels | null, inventory: Swatch[]): PlanMetrics {
  const usage = new Map<string, number>();
  let beadCount = 0;
  cells.forEach((cell) => {
    if (!cell) return;
    beadCount += 1;
    const key = colorKey(cell.brand ?? "MARD", cell.code);
    usage.set(key, (usage.get(key) ?? 0) + 1);
  });

  const usableStock = new Map(inventory.map((item) => [colorKey(item.brand, item.code), Math.max(0, item.count - item.safe)]));
  let coveredByStock = 0;
  let shortage = 0;
  usage.forEach((count, key) => {
    const usable = usableStock.get(key) ?? 0;
    coveredByStock += Math.min(count, usable);
    shortage += Math.max(0, count - usable);
  });

  const sourceBeads = reference ? reference.pixels.reduce((sum, pixel) => sum + (pixel ? 1 : 0), 0) : beadCount;
  let match = 100;
  if (reference && sourceBeads) {
    let similarityTotal = 0;
    reference.pixels.forEach((pixel, index) => {
      if (!pixel) return;
      const cell = cells[index];
      if (!cell) return;
      similarityTotal += Math.max(0, 100 - Math.sqrt(perceptualDistance(pixel, hexToRgb(cell.color))) / 5);
    });
    match = Math.round(similarityTotal / sourceBeads);
  }

  return {
    match,
    stock: sourceBeads ? Math.round(coveredByStock / sourceBeads * 100) : 100,
    shortage,
    colors: usage.size,
    beads: beadCount,
    unfilled: Math.max(0, sourceBeads - beadCount),
    time: estimateMakingTime(beadCount),
  };
}

function BrandMark({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand" aria-label="回到一粒画首页" onClick={onClick}>
      <span className="brand-mark" aria-hidden="true"><span className="brand-pixel-heart" /></span>
      <span className="brand-name"><b>一粒画</b><small>YILI BEADS</small></span>
    </button>
  );
}

const creatorSteps = [
  { number: "01", title: "准备图片", note: "裁切、主体与尺寸" },
  { number: "02", title: "用色策略", note: "库存、品牌与颜色" },
  { number: "03", title: "方案对比", note: "效果、用量与缺色" },
  { number: "04", title: "精修图纸", note: "去杂色、替色与格点" },
  { number: "05", title: "导出制作", note: "分区、清单与进度" },
] as const;

function CreatorJourney({
  activeStep,
  canCompare,
  onNavigate,
}: {
  activeStep: number;
  canCompare: boolean;
  onNavigate: (screen: Screen) => void;
}) {
  function navigateToStep(index: number) {
    if (index <= 1) onNavigate("create");
    else if (index === 2 && canCompare) onNavigate("plans");
    else if (index >= 3 && canCompare) onNavigate("craft");
  }

  return (
    <aside className="creator-journey" aria-label="图纸创作进度">
      <div className="creator-journey-copy">
        <span>CREATION FLOW</span>
        <h2>从图片到可制作图纸</h2>
        <p>每一步只解决一个关键问题。</p>
      </div>
      <div className="creator-steps">
        {creatorSteps.map((step, index) => {
          const disabled = index >= 2 && !canCompare;
          const state = index === activeStep ? "active" : index < activeStep ? "completed" : "upcoming";
          return (
            <button
              key={step.number}
              className={`creator-step ${state}`}
              aria-current={index === activeStep ? "step" : undefined}
              disabled={disabled}
              onClick={() => navigateToStep(index)}
            >
              <span>{index < activeStep ? "✓" : step.number}</span>
              <span><b>{step.title}</b><small>{step.note}</small></span>
            </button>
          );
        })}
      </div>
      <div className="creator-help">
        <b>为什么这样选？</b>
        <p>每个推荐都会说明它对清晰度、用豆量和缺货风险的影响。</p>
      </div>
    </aside>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [showSplash, setShowSplash] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);
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
  const [imageFit, setImageFit] = useState<ImageFit>("cover");
  const [imageSampling, setImageSampling] = useState<ImageSampling>("smooth");
  const [selectedColorKeys, setSelectedColorKeys] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [generatedPatterns, setGeneratedPatterns] = useState<GeneratedPatterns | null>(null);
  const [generationReference, setGenerationReference] = useState<PreparedPatternPixels | null>(null);
  const [patternView, setPatternView] = useState<PatternView>("chart");
  const [chartZoom, setChartZoom] = useState(1);
  const [overviewZoom, setOverviewZoom] = useState(1);
  const [chartFocus, setChartFocus] = useState(false);
  const [sectionRow, setSectionRow] = useState(0);
  const [sectionColumn, setSectionColumn] = useState(0);
  const [inventory, setInventory] = useState<Swatch[]>(swatches);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [preferredColorKeys, setPreferredColorKeys] = useState<string[]>([]);
  const [showInventoryAdder, setShowInventoryAdder] = useState(false);
  const [inventoryAdderBrand, setInventoryAdderBrand] = useState<ReplacementBrand>("MARD");
  const [inventoryAdderQuery, setInventoryAdderQuery] = useState("");
  const [inventoryAddCount, setInventoryAddCount] = useState(100);
  const [inventoryAddSafe, setInventoryAddSafe] = useState(20);
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
  const [redoHistory, setRedoHistory] = useState<ReplacementHistoryItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editTool, setEditTool] = useState<CellEditTool>("paint");
  const [editColor, setEditColor] = useState<NonNullable<GeneratedCell> | null>(null);
  const [mirrorEdit, setMirrorEdit] = useState(false);
  const [continuousEdit, setContinuousEdit] = useState(true);
  const [cellSelection, setCellSelection] = useState<CellSelection | null>(null);
  const [speckleMaxSize, setSpeckleMaxSize] = useState(2);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedPurchaseKeys, setSelectedPurchaseKeys] = useState<string[]>([]);
  const [showBatchReplace, setShowBatchReplace] = useState(false);
  const [batchSimilarity, setBatchSimilarity] = useState(75);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [projectsReady, setProjectsReady] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState("我的库存适配图纸");
  const overviewViewportRef = useRef<HTMLDivElement>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const homeFileRef = useRef<HTMLInputElement>(null);
  const inventoryFileRef = useRef<HTMLInputElement>(null);
  const editStrokeRef = useRef<{ plan: Strategy; original: GeneratedCell[]; working: GeneratedCell[]; nextCell: GeneratedCell; changed: Set<number> } | null>(null);
  usePinchZoom(overviewViewportRef, overviewZoom, patternView === "preview" ? setOverviewZoom : undefined, .5, 3, 1);

  /* eslint-disable react-hooks/set-state-in-effect -- Browser storage is hydrated only after the client mounts. */
  useEffect(() => {
    try {
      const forceSplashPreview = new URLSearchParams(window.location.search).get("splash") === "1";
      if (!forceSplashPreview && window.sessionStorage.getItem("bead-studio-splash-v1")) {
        setShowSplash(false);
        return;
      }
      window.sessionStorage.setItem("bead-studio-splash-v1", "seen");
    } catch {
      // The splash can still run when session storage is unavailable.
    }
    const leaveTimer = window.setTimeout(() => setSplashLeaving(true), 2600);
    const hideTimer = window.setTimeout(() => setShowSplash(false), 3000);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("doucang-inventory-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Swatch[];
        if (Array.isArray(parsed)) setInventory(parsed);
      }
      const savedPreferences = window.localStorage.getItem("yilihua-inventory-preferences-v1");
      if (savedPreferences) {
        const parsedPreferences = JSON.parse(savedPreferences) as string[];
        if (Array.isArray(parsedPreferences)) setPreferredColorKeys(parsedPreferences.filter((key) => typeof key === "string"));
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
    window.localStorage.setItem("yilihua-inventory-preferences-v1", JSON.stringify(preferredColorKeys));
  }, [inventory, inventoryReady, preferredColorKeys]);

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
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!showShoppingList && !showBatchReplace && !showProjects && !showInventoryAdder) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowShoppingList(false);
        setShowBatchReplace(false);
        setShowProjects(false);
        setShowInventoryAdder(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showBatchReplace, showInventoryAdder, showProjects, showShoppingList]);

  const currentPlan = plans.find((plan) => plan.id === selectedPlan) ?? plans[0];
  const totalStock = useMemo(() => inventory.reduce((sum, item) => sum + item.count, 0), [inventory]);
  const inventoryKeys = useMemo(() => new Set(inventory.map((item) => colorKey(item.brand, item.code))), [inventory]);
  const activePreferredColorKeys = useMemo(() => preferredColorKeys.filter((key) => inventoryKeys.has(key)), [inventoryKeys, preferredColorKeys]);
  const activeSelectedColorKeys = useMemo(() => {
    const inventoryKeys = new Set(inventory.map((item) => colorKey(item.brand, item.code)));
    return selectedColorKeys.filter((key) => inventoryKeys.has(key));
  }, [inventory, selectedColorKeys]);
  const selectedGenerationColors = useMemo(() => {
    const selectedKeys = new Set(activeSelectedColorKeys);
    return inventory.filter((item) => selectedKeys.has(colorKey(item.brand, item.code)));
  }, [activeSelectedColorKeys, inventory]);
  const lowStockCount = useMemo(() => inventory.filter((item) => item.count < item.safe * 4).length, [inventory]);
  const filteredInventory = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();
    const preferred = new Set(activePreferredColorKeys);
    return inventory.filter((item) => {
      const matchesQuery = !query || item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query) || item.brand.toLowerCase().includes(query) || item.color.toLowerCase().includes(query);
      const matchesFilter = inventoryFilter === "all"
        || (inventoryFilter === "low" && item.count < item.safe * 4)
        || (inventoryFilter === "preferred" && preferred.has(colorKey(item.brand, item.code)));
      return matchesQuery && matchesFilter;
    });
  }, [activePreferredColorKeys, inventory, inventoryFilter, inventoryQuery]);
  const progress = Math.round((completedColors.length / 5) * 100);
  const selectedPattern = generatedPatterns?.[selectedPlan] ?? null;
  const metricsByPlan = useMemo(() => Object.fromEntries(plans.map((plan) => {
    const cells = generatedPatterns?.[plan.id];
    const metrics: PlanMetrics = cells
      ? calculatePlanMetrics(cells, generationReference, inventory)
      : { match: plan.match, stock: plan.stock, shortage: plan.shortage, colors: plan.colors, beads: gridSize * gridSize, unfilled: 0, time: plan.time };
    return [plan.id, metrics];
  })) as Record<Strategy, PlanMetrics>, [generatedPatterns, generationReference, gridSize, inventory]);
  const currentPlanMetrics = metricsByPlan[selectedPlan];
  const recommendedPlan = useMemo<Strategy>(() => {
    if (!generatedPatterns) return "balance";
    if (ignoreStock) return "quality";
    return plans.reduce((best, plan) => {
      const score = metricsByPlan[plan.id].match * .6 + metricsByPlan[plan.id].stock * .4;
      const bestScore = metricsByPlan[best].match * .6 + metricsByPlan[best].stock * .4;
      return score > bestScore ? plan.id : best;
    }, "zero" as Strategy);
  }, [generatedPatterns, ignoreStock, metricsByPlan]);
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
  const selectedEditIndexes = useMemo(() => {
    if (!cellSelection) return new Set<number>();
    return new Set(rectangleIndexes(cellSelection.start, cellSelection.end ?? cellSelection.start, craftSize));
  }, [cellSelection, craftSize]);
  const editPalette = useMemo(() => {
    const colors = new Map<string, UsageItem>();
    craftUsage.forEach((item) => colors.set(colorKey(item.brand, item.code), item));
    inventory.forEach((item) => {
      const key = colorKey(item.brand, item.code);
      if (!colors.has(key)) colors.set(key, { brand: item.brand, code: item.code, color: item.color, count: 0, name: item.name });
    });
    return [...colors.values()];
  }, [craftUsage, inventory]);
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
  const inventoryAdderCatalog = inventoryAdderBrand === "MARD"
    ? mardColors.map((item) => ({ brand: "MARD" as const, code: item.code, name: "MARD 参考色", color: item.hex, series: item.series }))
    : crossBrandColors
      .filter((item) => item.brand === inventoryAdderBrand)
      .map((item) => ({ brand: item.brand, code: item.code, name: item.name, color: item.hex, series: item.series }));
  const visibleInventoryAdderColors = inventoryAdderCatalog.filter((item) => {
    const query = inventoryAdderQuery.trim().toLowerCase();
    return !query || item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query) || item.color.toLowerCase().includes(query);
  });
  const catalogSource = selectedBrand === "MARD"
    ? mardColors.map((item) => ({ code: item.code, name: "MARD 参考色", color: item.hex, series: item.series, range: item.range, confidence: item.confidence }))
    : selectedCrossBrandColors.length
      ? selectedCrossBrandColors.map((item) => ({ code: item.code, name: item.name, color: item.hex, series: item.series, range: "base" as const, confidence: "open-reference" as const }))
      : [];
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
    setGenerationReference(null);
    setCompletedColors([]);
    setProjectCompleted(false);
    setReplacementPreview(null);
    setReplacementHistory([]);
    setRedoHistory([]);
    setEditMode(false);
    setCellSelection(null);
    editStrokeRef.current = null;
    setEditColor(null);
    setActiveProjectId(null);
    setCurrentProjectTitle("我的库存适配图纸");
  }

  function handleHomeUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.[0]) return;
    handleUpload(event);
    go("create");
  }

  function startNewProject() {
    setGeneratedPatterns(null);
    setGenerationReference(null);
    setUploadedImage(null);
    setActiveProjectId(null);
    setCurrentProjectTitle("我的库存适配图纸");
    setCompletedColors([]);
    setProjectCompleted(false);
    setReplacementPreview(null);
    setReplacementHistory([]);
    setRedoHistory([]);
    setEditMode(false);
    setCellSelection(null);
    editStrokeRef.current = null;
    setEditColor(null);
    setPatternView("chart");
    setShowProjects(false);
    go("create");
  }

  function restoreProject(project: SavedProject) {
    const cells = decodePattern(project);
    setGeneratedPatterns({ zero: cells, balance: cells, quality: cells });
    setGenerationReference(null);
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
    setRedoHistory([]);
    setEditMode(false);
    setCellSelection(null);
    editStrokeRef.current = null;
    setEditColor(null);
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

  function setInventoryAmount(brand: string, code: string, field: "count" | "safe", value: number) {
    const nextValue = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
    setInventory((items) => items.map((item) => item.brand === brand && item.code === code ? { ...item, [field]: nextValue } : item));
  }

  function togglePreferredColor(brand: string, code: string) {
    const key = colorKey(brand, code);
    setPreferredColorKeys((keys) => keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key]);
  }

  function removeInventoryColor(brand: string, code: string) {
    const item = inventory.find((entry) => entry.brand === brand && entry.code === code);
    if (!item || !window.confirm(`从库存中删除 ${brand} ${code}「${item.name}」吗？`)) return;
    const key = colorKey(brand, code);
    setInventory((items) => items.filter((entry) => colorKey(entry.brand, entry.code) !== key));
    setPreferredColorKeys((keys) => keys.filter((entry) => entry !== key));
    setSelectedColorKeys((keys) => keys.filter((entry) => entry !== key));
    flash(`${brand} ${code} 已移出库存`);
  }

  function addInventoryColor(item: { brand: string; code: string; name: string; color: string }) {
    const count = Math.max(0, Math.round(inventoryAddCount));
    const safe = Math.max(0, Math.round(inventoryAddSafe));
    const key = colorKey(item.brand, item.code);
    const existed = inventoryKeys.has(key);
    setInventory((items) => {
      const existing = items.find((entry) => colorKey(entry.brand, entry.code) === key);
      if (existing) return items.map((entry) => entry === existing ? { ...entry, count: entry.count + count, safe } : entry);
      return [...items, { ...item, count, safe }];
    });
    flash(existed ? `${item.brand} ${item.code} 已增加 ${count} 颗` : `${item.brand} ${item.code} 已加入库存`);
  }

  function exportInventory() {
    const header = "品牌,色号,颜色名称,HEX,数量,安全库存";
    const rows = inventory.map((item) => [item.brand, item.code, item.name, item.color, item.count, item.safe].join(","));
    const blob = new Blob([`\uFEFF${[header, ...rows].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "拼豆库存.csv";
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
      setPreferredColorKeys([]);
      setGeneratedPatterns(null);
      setGenerationReference(null);
      flash(`已导入 ${imported.length} 个库存色号`);
    } catch {
      flash("导入失败，请使用本工具导出的 CSV 格式");
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
    setRedoHistory([]);
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
      `一粒画采购清单｜${projectDisplayTitle}`,
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
    link.download = `拼豆采购清单-${craftSize}x${craftSize}.csv`;
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

  function toggleGenerationColor(brand: string, code: string) {
    const key = colorKey(brand, code);
    setSelectedColorKeys((keys) => keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key]);
  }

  function toggleCellEditor() {
    if (!generatedPatterns || !selectedPattern) {
      flash("请先生成一张图纸，再进行格子修图");
      return;
    }
    const nextMode = !editMode;
    setEditMode(nextMode);
    if (!nextMode) setCellSelection(null);
    setReplacementPreview(null);
    setHighlight(null);
    if (nextMode) {
      if (patternView === "preview") setPatternView("chart");
      if (!editColor && editPalette[0]) {
        const first = editPalette[0];
        setEditColor({ brand: first.brand, code: first.code, color: first.color, name: first.name });
      }
      flash("格子修图已开启：画笔、填充、橡皮和吸管都已就绪");
    }
  }

  function chooseEditTool(tool: CellEditTool) {
    setEditTool(tool);
    if (tool !== "select") setCellSelection(null);
  }

  function currentPaintCell(): GeneratedCell {
    const fallbackColor = editPalette[0];
    return editColor ? { ...editColor } : fallbackColor ? { brand: fallbackColor.brand, code: fallbackColor.code, color: fallbackColor.color, name: fallbackColor.name } : null;
  }

  function applyStrokeIndex(index: number) {
    const stroke = editStrokeRef.current;
    if (!stroke) return;
    const targets = new Set([index]);
    if (mirrorEdit) {
      const row = Math.floor(index / craftSize);
      const column = index % craftSize;
      targets.add(row * craftSize + (craftSize - 1 - column));
    }
    let changed = false;
    targets.forEach((cellIndex) => {
      if (sameGeneratedCell(stroke.working[cellIndex], stroke.nextCell)) return;
      stroke.working[cellIndex] = stroke.nextCell ? { ...stroke.nextCell } : null;
      stroke.changed.add(cellIndex);
      changed = true;
    });
    if (changed) setGeneratedPatterns((patterns) => patterns ? { ...patterns, [stroke.plan]: [...stroke.working] } : patterns);
  }

  function handleCellStrokeStart(index: number) {
    if (!generatedPatterns || !selectedPattern || (editTool !== "paint" && editTool !== "erase")) return;
    const nextCell = editTool === "erase" ? null : currentPaintCell();
    if (editTool === "paint" && !nextCell) {
      flash("请先选择一个画笔颜色");
      return;
    }
    editStrokeRef.current = { plan: selectedPlan, original: selectedPattern, working: [...selectedPattern], nextCell, changed: new Set<number>() };
    applyStrokeIndex(index);
  }

  function handleCellStrokeMove(index: number) {
    applyStrokeIndex(index);
  }

  function handleCellStrokeEnd() {
    const stroke = editStrokeRef.current;
    editStrokeRef.current = null;
    if (!stroke || !stroke.changed.size) return;
    setGeneratedPatterns((patterns) => patterns ? { ...patterns, [stroke.plan]: [...stroke.working] } : patterns);
    setReplacementHistory((history) => [...history.slice(-19), { plan: stroke.plan, cells: stroke.original, fromCode: "连续涂画", toCode: `${stroke.changed.size} 格${mirrorEdit ? "（含左右镜像）" : ""}` }]);
    setRedoHistory([]);
    setProjectCompleted(false);
    flash(`已连续修改 ${stroke.changed.size} 格，可整次撤销`);
  }

  function applyCellSelection(clear: boolean) {
    if (!generatedPatterns || !selectedPattern || !cellSelection || cellSelection.end === null) return;
    const nextCell = clear ? null : currentPaintCell();
    if (!clear && !nextCell) {
      flash("请先选择一个填充颜色");
      return;
    }
    const targets = new Set(selectedEditIndexes);
    if (mirrorEdit) {
      [...targets].forEach((index) => {
        const row = Math.floor(index / craftSize);
        const column = index % craftSize;
        targets.add(row * craftSize + (craftSize - 1 - column));
      });
    }
    const effectiveIndexes = [...targets].filter((index) => !sameGeneratedCell(selectedPattern[index], nextCell));
    if (!effectiveIndexes.length) {
      flash("所选区域已经是这个状态");
      return;
    }
    const nextCells = [...selectedPattern];
    effectiveIndexes.forEach((index) => { nextCells[index] = nextCell ? { ...nextCell } : null; });
    const action = clear ? "框选清空" : "框选填色";
    setReplacementHistory((history) => [...history.slice(-19), { plan: selectedPlan, cells: selectedPattern, fromCode: action, toCode: `${effectiveIndexes.length} 格${mirrorEdit ? "（含左右镜像）" : ""}` }]);
    setRedoHistory([]);
    setGeneratedPatterns({ ...generatedPatterns, [selectedPlan]: nextCells });
    setProjectCompleted(false);
    flash(`已${clear ? "清空" : "填色"} ${effectiveIndexes.length} 格，可整次撤销`);
  }

  function handleCellEdit(index: number, cell: GeneratedCell) {
    if (!generatedPatterns || !selectedPattern) return;
    if (editTool === "select") {
      if (!cellSelection || cellSelection.end !== null) {
        setCellSelection({ start: index, end: null });
        const row = Math.floor(index / craftSize) + 1;
        const column = index % craftSize + 1;
        flash(`已选择起点：${row} 行 ${column} 列，请再点一次确定范围`);
      } else {
        const indexes = rectangleIndexes(cellSelection.start, index, craftSize);
        setCellSelection({ ...cellSelection, end: index });
        flash(`已框选 ${indexes.length} 格，可批量填色或清空`);
      }
      return;
    }
    if (editTool === "pick") {
      if (!cell) {
        flash("这里是空格，请选择一个有颜色的格子吸取");
        return;
      }
      setEditColor({ ...cell, brand: cell.brand ?? "MARD" });
      chooseEditTool("paint");
      flash(`已吸取 ${cell.brand ?? "MARD"} ${cell.code}，画笔已就绪`);
      return;
    }

    const fallbackColor = editPalette[0];
    const paintColor = editColor ?? (fallbackColor ? { brand: fallbackColor.brand, code: fallbackColor.code, color: fallbackColor.color, name: fallbackColor.name } : null);
    const nextCell: GeneratedCell = editTool === "erase" ? null : paintColor ? { ...paintColor } : cell;
    if ((editTool === "paint" || editTool === "fill") && !paintColor) {
      flash("请先选择一个画笔颜色");
      return;
    }

    const changedIndexes = new Set<number>();
    if (editTool === "fill") {
      if (sameGeneratedCell(cell, nextCell)) return;
      const visited = new Uint8Array(selectedPattern.length);
      const queue = [index];
      while (queue.length) {
        const current = queue.pop()!;
        if (visited[current]) continue;
        visited[current] = 1;
        if (!sameGeneratedCell(selectedPattern[current], cell)) continue;
        changedIndexes.add(current);
        const row = Math.floor(current / craftSize);
        const column = current % craftSize;
        if (row > 0) queue.push(current - craftSize);
        if (row < craftSize - 1) queue.push(current + craftSize);
        if (column > 0) queue.push(current - 1);
        if (column < craftSize - 1) queue.push(current + 1);
      }
    } else {
      changedIndexes.add(index);
    }

    if (mirrorEdit) {
      [...changedIndexes].forEach((cellIndex) => {
        const row = Math.floor(cellIndex / craftSize);
        const column = cellIndex % craftSize;
        changedIndexes.add(row * craftSize + (craftSize - 1 - column));
      });
    }

    const effectiveIndexes = [...changedIndexes].filter((cellIndex) => !sameGeneratedCell(selectedPattern[cellIndex], nextCell));
    if (!effectiveIndexes.length) return;

    const row = Math.floor(index / craftSize) + 1;
    const column = index % craftSize + 1;
    const nextCells = [...selectedPattern];
    effectiveIndexes.forEach((cellIndex) => { nextCells[cellIndex] = nextCell; });
    const actionLabel = editTool === "fill" ? `${effectiveIndexes.length} 格区域` : `${row} 行 ${column} 列${mirrorEdit && effectiveIndexes.length > 1 ? "＋镜像" : ""}`;
    setReplacementHistory((history) => [...history.slice(-19), { plan: selectedPlan, cells: selectedPattern, fromCode: editTool === "fill" ? "区域填充" : "手动修图", toCode: actionLabel }]);
    setRedoHistory([]);
    setGeneratedPatterns({ ...generatedPatterns, [selectedPlan]: nextCells });
    setProjectCompleted(false);
    if (editTool === "fill") flash(`已填充 ${effectiveIndexes.length} 格${mirrorEdit ? "（含左右镜像）" : ""}`);
  }

  function applySpeckleCleanup() {
    if (!generatedPatterns || !selectedPattern) {
      flash("请先生成一张图纸");
      return;
    }
    const cleaned = removeSpeckles(selectedPattern, craftSize, speckleMaxSize);
    if (!cleaned.changed) {
      flash(`当前图纸没有需要清理的 1–${speckleMaxSize} 格杂色块`);
      return;
    }
    setReplacementHistory((history) => [...history.slice(-9), { plan: selectedPlan, cells: selectedPattern, fromCode: "一键去杂色", toCode: `${cleaned.changed} 格` }]);
    setRedoHistory([]);
    setGeneratedPatterns({ ...generatedPatterns, [selectedPlan]: cleaned.cells });
    setHighlight(null);
    setReplacementPreview(null);
    setProjectCompleted(false);
    flash(`已清理 ${cleaned.changed} 格孤立杂色（色块上限 ${speckleMaxSize} 格），可随时撤销`);
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
    setRedoHistory([]);
    setGeneratedPatterns({ ...generatedPatterns, [selectedPlan]: nextCells });
    setHighlight(replacementPreview.toCode);
    setReplacementPreview(null);
    setProjectCompleted(false);
    flash(`已将 ${replacementNeeded} 格替换为 ${replacementPreview.brand} ${replacementPreview.toCode}`);
  }

  function undoReplacement() {
    const latest = replacementHistory[replacementHistory.length - 1];
    if (!latest || !generatedPatterns) return;
    const currentCells = generatedPatterns[latest.plan];
    setRedoHistory((history) => [...history.slice(-19), { ...latest, cells: currentCells }]);
    setGeneratedPatterns((patterns) => patterns ? { ...patterns, [latest.plan]: latest.cells } : patterns);
    setSelectedPlan(latest.plan);
    setCellSelection(null);
    setHighlight(latest.fromCode === "批量换色" || latest.fromCode === "一键去杂色" || latest.fromCode === "手动修图" || latest.fromCode === "区域填充" || latest.fromCode === "连续涂画" || latest.fromCode === "框选填色" || latest.fromCode === "框选清空" ? null : latest.fromCode);
    setReplacementPreview(null);
    setReplacementHistory((history) => history.slice(0, -1));
    setProjectCompleted(false);
    flash(`已撤销 ${latest.fromCode} → ${latest.toCode}`);
  }

  function redoReplacement() {
    const latest = redoHistory[redoHistory.length - 1];
    if (!latest || !generatedPatterns) return;
    const currentCells = generatedPatterns[latest.plan];
    setReplacementHistory((history) => [...history.slice(-19), { ...latest, cells: currentCells }]);
    setGeneratedPatterns((patterns) => patterns ? { ...patterns, [latest.plan]: latest.cells } : patterns);
    setSelectedPlan(latest.plan);
    setCellSelection(null);
    setHighlight(null);
    setReplacementPreview(null);
    setRedoHistory((history) => history.slice(0, -1));
    setProjectCompleted(false);
    flash(`已重做 ${latest.fromCode} → ${latest.toCode}`);
  }

  async function generate() {
    if (!uploadedImage) {
      flash("请先上传一张图片");
      fileRef.current?.click();
      return;
    }
    if (activeSelectedColorKeys.length > 0 && activeSelectedColorKeys.length < 3) {
      flash("指定用色至少选择 3 种，或清空后让系统自动配色");
      return;
    }
    setIsGenerating(true);
    try {
      const prepared = await preparePatternPixels(uploadedImage, gridSize, colorShift, imageFit, imageSampling);
      setGenerationReference(prepared);
      const zero = generatePattern(prepared, "zero", ignoreStock, inventory, maxColors, activeSelectedColorKeys, activePreferredColorKeys);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const balance = generatePattern(prepared, "balance", ignoreStock, inventory, maxColors, activeSelectedColorKeys, activePreferredColorKeys);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const quality = generatePattern(prepared, "quality", ignoreStock, inventory, maxColors, activeSelectedColorKeys, activePreferredColorKeys);
      setGeneratedPatterns({ zero, balance, quality });
      setActiveProjectId(`project-${Date.now()}`);
      setCurrentProjectTitle(`库存适配图纸 · ${gridSize}×${gridSize}`);
      setReplacementPreview(null);
      setReplacementHistory([]);
      setRedoHistory([]);
      setEditMode(false);
      setCellSelection(null);
      editStrokeRef.current = null;
      setEditColor(null);
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

  function dismissSplash() {
    try {
      window.sessionStorage.setItem("bead-studio-splash-v1", "seen");
    } catch {
      // Continue into the workspace when browser storage is unavailable.
    }
    setSplashLeaving(true);
    window.setTimeout(() => setShowSplash(false), 400);
  }

  return (
    <main className="app-shell">
      {showSplash && (
        <section className={`brand-splash ${splashLeaving ? "is-leaving" : ""}`} role="dialog" aria-modal="true" aria-label="进入拼豆创作工作台">
          <div className="brand-splash-grid" aria-hidden="true" />
          <div className="brand-splash-content">
            <div className="brand-splash-copy">
              <div className="brand-splash-brand"><span aria-hidden="true"><i /><i /><i /><i /></span><b>一粒画</b><em>拼豆创作台</em></div>
              <span className="brand-splash-kicker">图片转图纸 · 库存适配 · 分区制作</span>
              <h1>把喜欢的图，<br />慢慢拼出来。</h1>
              <p>先看看效果，再决定用哪些颜色。缺色、杂色和品牌色号，都帮你整理清楚。</p>
              <button onClick={dismissSplash}>开始拼图纸 <span>→</span></button>
              <div className="brand-splash-facts"><span>不用注册</span><span>保存在本机</span><span>手机也能看</span></div>
              <div className="brand-splash-progress" aria-hidden="true"><i /></div>
            </div>
            <div className="brand-splash-product" aria-label="示例拼豆图纸">
              <div className="brand-splash-product-head"><div><small>示例图纸</small><strong>橘猫午后</strong></div><span>15 × 15</span></div>
              <div className="brand-splash-board"><div className="brand-splash-art"><BeadArtwork /></div><span className="brand-splash-coordinate is-x">05　10　15</span><span className="brand-splash-coordinate is-y">05　10　15</span></div>
              <div className="brand-splash-product-foot"><div>{inventory.slice(0, 7).map((item) => <i key={`splash-stock-${item.brand}-${item.code}`} style={{ background: item.color }} />)}</div><span>7 色 · 225 颗</span><b>图纸可放大</b></div>
            </div>
          </div>
        </section>
      )}
      <header className={`topbar ${screen === "home" ? "home-topbar" : ""}`}>
        <BrandMark onClick={() => go("home")} />
        <nav className="desktop-nav" aria-label="主导航">
          <button className={screen === "home" ? "active" : ""} onClick={() => go("home")}>首页</button>
          <button className={screen === "inventory" ? "active" : ""} onClick={() => go("inventory")}>我的库存</button>
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
        <div className="page home-page home-v5 platform-home refined-home cute-home">
          <header className="product-home-heading">
            <div><span>一粒画</span><h1>我的拼豆创作台</h1><p>从图片、颜色到清晰图纸，都放在一个地方。</p></div>
            <small><i /> 不用登录 · 自动保存在本机</small>
          </header>

          <section className="product-launcher">
            <article className="product-new-project">
              <input ref={homeFileRef} type="file" accept="image/*" hidden onChange={handleHomeUpload} />
              <span className="product-section-label">✦ 按你的库存生成，不够的颜色给替代方案</span>
              <h2>把喜欢，<br />一粒粒拼出来</h2>
              <p>上传图片，自动变成能看清、能照着做的拼豆图纸。画布、颜色和品牌色号都可以继续调整。</p>
              <div className="product-launch-actions">
                <button className="is-primary" onClick={() => { setIgnoreStock(false); homeFileRef.current?.click(); }}>
                  <span className="product-action-icon" aria-hidden="true"><i /><i /><i /><i /></span>
                  <span><strong>开始图片转拼豆</strong><small>优先使用手头已有的豆子</small></span><b>→</b>
                </button>
                <button onClick={() => { setIgnoreStock(true); homeFileRef.current?.click(); }}>
                  <span className="product-action-icon is-neutral" aria-hidden="true"><i /><i /><i /><i /></span>
                  <span><strong>无视库存生成</strong><small>使用完整色库，尽量保留原图颜色</small></span><b>→</b>
                </button>
              </div>
              <div className="product-hero-stats">
                <div><strong>{inventory.length}</strong><span>库存颜色</span></div>
                <div><strong>{brandCatalog.length}</strong><span>常用品牌</span></div>
                <div><strong>{savedProjects.length || "∞"}</strong><span>{savedProjects.length ? "保存作品" : "创作可能"}</span></div>
              </div>
            </article>

            <article className="product-live-card">
              <div className="product-live-head"><div><small>图纸效果预览</small><strong>同一张图，也可以有不同配色</strong></div><button onClick={() => go("create")}>自己试试 ↗</button></div>
              <div className="product-live-canvas">
                <div className="product-example-grid">
                  <div className="product-example-tile is-original"><div>{savedProjects[0]?.preview?.length ? <div className="refined-saved-preview">{savedProjects[0].preview.map((color, index) => <i key={`home-live-${index}`} style={{ background: color }} />)}</div> : <BeadArtwork />}</div><span>{savedProjects[0] ? "最近作品" : "原色效果"}</span></div>
                  <div className="product-example-tile is-pink"><div><BeadArtwork /></div><span>柔粉配色</span></div>
                  <div className="product-example-tile is-blue"><div><BeadArtwork /></div><span>清透配色</span></div>
                  <div className="product-example-tile is-soft"><div><BeadArtwork /></div><span>低饱和配色</span></div>
                </div>
              </div>
              <div className="product-live-foot"><div>{inventory.slice(0, 7).map((item) => <i key={`home-palette-${item.brand}-${item.code}`} style={{ background: item.color }} />)}</div><span>库存配色 · 完整色库 · 颜色偏转</span><b>图纸可放大查看</b></div>
            </article>
          </section>

          <section className="home-preset-strip" aria-label="常用图纸预设">
            {[
              { label: "推荐", size: 29, colors: 16 },
              { label: "头像", size: 58, colors: 32 },
              { label: "卡通", size: 58, colors: 48 },
              { label: "宠物", size: 58, colors: 64 },
              { label: "人物", size: 87, colors: 96 },
              { label: "风景", size: 116, colors: 128 },
              { label: "小挂件", size: 29, colors: 8 },
              { label: "精细大图", size: 116, colors: 264 },
            ].map((preset) => (
              <button
                key={preset.label}
                className={gridSize === preset.size && maxColors === preset.colors ? "is-active" : ""}
                onClick={() => { setGridSize(preset.size); setMaxColors(preset.colors); }}
              >
                {preset.label}<small>{preset.size}格 · {preset.colors}色</small>
              </button>
            ))}
          </section>

          <div className="home-section-title"><span>快捷创作</span><p>从最常用的操作直接开始</p></div>
          <section className="product-shortcuts" aria-label="快捷创作">
            <button onClick={() => { setIgnoreStock(false); homeFileRef.current?.click(); }}><span className="product-shortcut-icon is-upload">▧</span><span><strong>图转拼豆</strong><small>照片一键转图纸</small></span><b>→</b></button>
            <button onClick={() => { setIgnoreStock(true); homeFileRef.current?.click(); }}><span className="product-shortcut-icon is-color">✿</span><span><strong>完整色库生成</strong><small>暂时无视库存</small></span><b>→</b></button>
            <button onClick={() => go("inventory")}><span className="product-shortcut-icon is-stock">▦</span><span><strong>库存与色号</strong><small>{inventory.length} 色 · {brandCatalog.length} 品牌</small></span><b>→</b></button>
            <button onClick={() => go("craft")}><span className="product-shortcut-icon is-craft">✓</span><span><strong>继续制作</strong><small>图纸、分区与进度</small></span><b>→</b></button>
          </section>

          <div className="home-section-title is-overview"><span>我的创作</span><p>继续上次的图纸，顺手看看豆子够不够</p></div>
          <section className="product-overview">
            <article className="product-recent-projects">
              <div className="product-card-head"><div><small>最近在拼</small><h2>{savedProjects.length ? "接着上次的进度" : "这里会保存你的作品"}</h2></div><button onClick={() => setShowProjects(true)}>全部作品 →</button></div>
              <div className="product-project-row">
                {savedProjects.length ? savedProjects.slice(0, 3).map((project) => (
                  <button key={`home-project-${project.id}`} onClick={() => restoreProject(project)}>
                    <div className="product-project-preview"><div className="refined-saved-preview">{project.preview.map((color, index) => <i key={`${project.id}-${index}`} style={{ background: color }} />)}</div></div>
                    <span><strong>{project.title}</strong><small>{project.size} × {project.size} · {project.palette.length} 色</small></span>
                  </button>
                )) : (
                  <button className="product-empty-project" onClick={() => go("create")}><span className="product-empty-plus">＋</span><span><strong>新建第一张图纸</strong><small>上传图片后会自动保存在这里</small></span></button>
                )}
              </div>
            </article>

            <aside className="product-stock-card">
              <div className="product-card-head"><div><small>我的豆子</small><h2>{totalStock.toLocaleString()} 颗豆子</h2></div><button onClick={() => go("inventory")}>管理 →</button></div>
              <div className="product-stock-swatches">{inventory.slice(0, 10).map((item) => <i key={`stock-summary-${item.brand}-${item.code}`} style={{ background: item.color }} title={`${item.brand} ${item.code}`} />)}</div>
              <div className="product-stock-stats"><div><strong>{inventory.length}</strong><span>已录入色号</span></div><div><strong>{lowStockCount}</strong><span>需要补货</span></div><div><strong>{savedProjects.length}</strong><span>保存作品</span></div></div>
              <div className="product-low-stock">
                <span>补货提醒</span>
                {inventory.filter((item) => item.count < item.safe * 4).slice(0, 2).map((item) => <button key={`low-${item.brand}-${item.code}`} onClick={() => go("inventory")}><i style={{ background: item.color }} /><b>{item.brand} {item.code}</b><em>剩 {item.count} 颗</em></button>)}
                {!lowStockCount && <small>目前没有明显缺货</small>}
              </div>
            </aside>
          </section>

          <section className="home-inspiration-section">
            <div className="home-inspiration-head">
              <div><span>灵感图纸</span><h2>不知道拼什么？先从喜欢的风格开始</h2><p>选择一个示例，会自动带上合适的画布和颜色数量，再上传你自己的图片。</p></div>
              <button onClick={() => go("create")}>自由设置画布 →</button>
            </div>
            <div className="home-inspiration-grid">
              {inspirationTemplates.map((template) => (
                <button
                  key={template.id}
                  className="home-inspiration-card"
                  style={{ "--template-bg": template.background } as CSSProperties}
                  onClick={() => {
                    setGridSize(template.size);
                    setMaxColors(template.colors);
                    setIgnoreStock(false);
                    homeFileRef.current?.click();
                  }}
                >
                  <span className="home-inspiration-art"><MiniPixelArtwork template={template} /></span>
                  <span className="home-inspiration-meta">
                    <small>{template.category}</small>
                    <strong>{template.title}</strong>
                    <em>{template.size} × {template.size} · 建议 {template.colors} 色</em>
                  </span>
                  <b>套用设置 ↗</b>
                </button>
              ))}
            </div>
          </section>

          <section className="studio-hero">
            <div className="studio-hero-copy">
              <div className="studio-kicker"><span><i /> 我的创作台</span><em>已保存在本机 ✓</em></div>
              <h1>今天想拼点<br /><span>什么？</span></h1>
              <p>从一张喜欢的图片开始。系统会按你的颜色和库存，准备一份真正能完成的清晰图纸。</p>
              <div className="studio-actions">
                <button className="studio-primary" onClick={() => go("create")}><span>＋ 新建图纸</span><i>→</i></button>
                <button className="studio-secondary" onClick={() => setShowProjects(true)}>打开我的作品</button>
              </div>
              <div className="studio-metrics" aria-label="产品能力">
                <div><strong>{savedProjects.length}</strong><span>保存的作品</span></div>
                <div><strong>{inventory.length}</strong><span>已录入色号</span></div>
                <div><strong>{totalStock.toLocaleString()}</strong><span>库存总颗数</span></div>
              </div>
            </div>

            <div className="studio-stage" aria-label="拼豆图纸效果预览">
              <div className="stage-window">
                <div className="stage-head">
                  <div><span className="stage-dot" /><b>图纸效果预览</b><small>库存适配 · 高清格点</small></div>
                  <span>36 × 36</span>
                </div>
                <div className="stage-tabs"><span>原图</span><span>效果</span><span className="active">图纸</span><span>用量</span></div>
                <div className="stage-canvas">
                  <div className="stage-axis stage-axis-x"><span>01</span><span>12</span><span>24</span><span>36</span></div>
                  <div className="stage-axis stage-axis-y"><span>01</span><span>12</span><span>24</span><span>36</span></div>
                  <div className="stage-art"><BeadArtwork /></div>
                  <div className="stage-zoom"><button aria-label="缩小预览">−</button><b>100%</b><button aria-label="放大预览">＋</button></div>
                </div>
                <div className="stage-foot">
                  <div className="stage-palette">
                    {inventory.slice(0, 6).map((item) => <i key={`hero-${item.brand}-${item.code}`} style={{ background: item.color }} title={`${item.brand} ${item.code}`} />)}
                    <span>+18</span>
                  </div>
                  <div><small>库存匹配</small><strong>96%</strong></div>
                  <button onClick={() => go("create")}>打开方案 →</button>
                </div>
              </div>
              <div className="stage-status stage-status-top"><span>✓</span><div><b>杂色已清理</b><small>减少 7 个孤立色块</small></div></div>
              <div className="stage-status stage-status-bottom"><span>◐</span><div><b>缺色可替代</b><small>已找到 3 组近似色</small></div></div>
            </div>
          </section>

          <section className="home-signal-bar" aria-label="支持能力">
              <span>常用品牌色号，都可以放进来</span>
            <div><b>MARD</b><b>COCO</b><b>漫漫</b><b>盼盼</b><b>咪小窝</b><b>HAMA</b></div>
            <button onClick={() => go("catalog")}>查看品牌色库 ↗</button>
          </section>

          <section className="platform-dashboard">
            <div className="platform-main-column">
              <div className="platform-section-head"><div><span>最近作品</span><h2>接着上次的灵感继续</h2></div><button onClick={() => setShowProjects(true)}>查看全部 →</button></div>
              <div className="platform-project-grid">
                <button className="platform-new-project" onClick={() => go("create")}><span>＋</span><b>创建新图纸</b><small>上传图片，开始一件新作品</small></button>
                {savedProjects.slice(0, 2).map((project) => {
                  const progressValue = project.projectCompleted ? 100 : project.palette.length ? Math.min(100, Math.round((project.completedColors?.length ?? 0) / project.palette.length * 100)) : 0;
                  return <button className="platform-project-card" key={`home-${project.id}`} onClick={() => restoreProject(project)}>
                    <span className="platform-project-preview">{project.preview.map((color, index) => <i key={index} style={{ background: color }} />)}</span>
                    <span className="platform-project-meta"><b>{project.title}</b><small>{project.size} × {project.size} · {project.palette.length} 色</small><em data-progress={`${progressValue}%`}><i style={{ width: `${progressValue}%` }} /></em></span>
                  </button>;
                })}
                {!savedProjects.length && <div className="platform-empty-project"><span>✦</span><b>第一件作品会出现在这里</b><small>生成后自动保存图纸与制作进度</small></div>}
              </div>
            </div>

            <aside className="platform-side-column">
              <section className="platform-inventory-card">
                <div className="platform-card-head"><div><span>我的库存</span><h3>{inventory.length} 种颜色可以使用</h3></div><button onClick={() => go("inventory")}>管理</button></div>
                <div className="platform-swatch-row">{inventory.slice(0, 8).map((item) => <i key={`platform-${item.brand}-${item.code}`} style={{ background: item.color }} title={`${item.brand} ${item.code} · ${item.count} 颗`} />)}</div>
                <div className="platform-stock-stats"><div><strong>{totalStock.toLocaleString()}</strong><span>总颗数</span></div><div><strong>{lowStockCount}</strong><span>库存偏低</span></div><div><strong>5</strong><span>可直接开拼</span></div></div>
              </section>
              <section className="platform-helper-card">
                <div className="platform-helper-icon"><span>✦</span><i>♡</i></div>
                <span>配色小助手</span><h3>颜色不够，也不用放弃喜欢的图。</h3><p>缺色时自动寻找近似色，也可以切换偏暖、偏冷或柔和方案。</p><button onClick={() => go("create")}>试试智能配色 →</button>
              </section>
            </aside>
          </section>

          <section className="home-flow-section">
            <div className="home-section-heading">
              <span>三步开始一件新作品 ✦</span>
              <h2>简单一点，<br />创作的快乐多一点。</h2>
              <p>复杂的颜色计算交给系统，你只需要选图片、挑颜色，然后照着清晰图纸慢慢拼。</p>
            </div>
            <div className="home-flow-grid">
              <article>
                <div className="flow-card-head"><span>01</span><em>INPUT</em></div>
                <h3>保留真正重要的主体</h3>
                <p>设置画布、裁切和色调方向，先保护轮廓与表情，再进入颜色压缩。</p>
                <div className="flow-visual flow-focus"><i /><i /><i /><i /><span>主体识别</span></div>
              </article>
              <article className="featured">
                <div className="flow-card-head"><span>02</span><em>MATCH</em></div>
                <h3>只在可用颜色里重绘</h3>
                <p>可按库存生成，也可无视库存；同时支持锁定色号和颜色偏转方案。</p>
                <div className="flow-visual flow-colors">
                  {inventory.slice(0, 8).map((item) => <i key={`flow-${item.brand}-${item.code}`} style={{ background: item.color }} />)}
                </div>
              </article>
              <article>
                <div className="flow-card-head"><span>03</span><em>MAKE</em></div>
                <h3>放大到每一格都看得清</h3>
                <p>总览、分区、格点编号、用量和采购清单一起导出，拿到桌上就能拼。</p>
                <div className="flow-visual flow-chart"><span>A7</span><span>A7</span><span>C3</span><span>C3</span><span>F8</span><span>F8</span><span>F8</span><span>A2</span><span>A2</span></div>
              </article>
            </div>
          </section>

          <section className="home-inventory-section">
            <div className="inventory-story">
              <span>我的豆子，我来做主 ♡</span>
              <h2>把拥有的颜色，<br />变成下一件作品。</h2>
              <p>录入现有豆子后，每一次生成都会同步核对数量。颜色不够时，你可以换近似色、加入采购清单，或者直接切换为无视库存。</p>
              <button onClick={() => go("inventory")}>进入库存工作台 <span>→</span></button>
            </div>
            <div className="inventory-live-card">
              <div className="inventory-live-head"><div><small>LIVE INVENTORY</small><b>当前库存</b></div><span><i /> 已同步</span></div>
              <strong>{totalStock.toLocaleString()}<small> 颗</small></strong>
              <div className="inventory-spectrum">
                {inventory.slice(0, 8).map((item) => <i key={`stock-${item.brand}-${item.code}`} style={{ background: item.color, flexGrow: Math.max(1, item.count) }} />)}
              </div>
              <div className="inventory-live-stats"><div><b>{inventory.length}</b><span>已录入色号</span></div><div><b>{lowStockCount}</b><span>库存偏低</span></div><div><b>5</b><span>可立即开拼</span></div></div>
              <div className="inventory-color-list">
                {inventory.slice(0, 4).map((item) => <div key={`list-${item.brand}-${item.code}`}><i style={{ background: item.color }} /><span><b>{item.code}</b><small>{item.brand} · {item.name}</small></span><em>{item.count} 颗</em></div>)}
              </div>
            </div>
          </section>

          <section className="home-final-cta">
            <div><span>准备好就开始吧 ✿</span><h2>下一件可爱的作品，正在等你。</h2></div>
            <button onClick={() => go("create")}>上传图片 <span>↗</span></button>
          </section>
        </div>
      )}

      {screen === "inventory" && (
        <div className="page inventory-page">
          <section className="page-title">
            <div><span className="eyebrow">MY BEAD INVENTORY</span><h1>我的库存</h1><p>让库存保持准确，生成的每张图才真正拼得出来。</p></div>
            <div className="title-actions"><input ref={inventoryFileRef} type="file" accept=".csv,text/csv" hidden onChange={importInventory} /><button className="secondary" onClick={() => inventoryFileRef.current?.click()}>导入 CSV</button><button className="secondary" onClick={exportInventory}>导出库存</button><button className="primary" onClick={() => { setInventoryAdderQuery(""); setShowInventoryAdder(true); }}>＋ 添加色号</button></div>
          </section>
          <div className="local-save-note"><span>✓</span><div><b>游客模式 · 已保存在本机</b><small>库存只保存在当前设备；可随时导出 CSV 备份或迁移。</small></div></div>
          <section className="inventory-overview">
            <div><span>库存总量</span><strong>{totalStock.toLocaleString()}<small> 颗</small></strong><em>{inventory.length ? `平均每色 ${Math.round(totalStock / inventory.length)} 颗` : "等待录入库存"}</em></div>
            <div><span>已录入色号</span><strong>{inventory.length}<small> 种</small></strong><em>{new Set(inventory.map((item) => item.brand)).size} 个品牌</em></div>
            <div><span>低于安全线</span><strong>{lowStockCount}<small> 种</small></strong><em className="warning">需要留意</em></div>
            <div><span>优先用色</span><strong>{activePreferredColorKeys.length}<small> 种</small></strong><em>生成时优先匹配</em></div>
          </section>
          <section className="panel inventory-table-wrap">
            <div className="table-toolbar"><div><button className={`chip ${inventoryFilter === "all" ? "active" : ""}`} onClick={() => setInventoryFilter("all")}>全部 {inventory.length}</button><button className={`chip ${inventoryFilter === "low" ? "active" : ""}`} onClick={() => setInventoryFilter("low")}>库存偏低 {lowStockCount}</button><button className={`chip ${inventoryFilter === "preferred" ? "active" : ""}`} onClick={() => setInventoryFilter("preferred")}>优先使用 {activePreferredColorKeys.length}</button></div><label className="search">⌕ <input aria-label="搜索色号" placeholder="搜索色号、品牌或颜色" value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} /></label></div>
            <div className="inventory-table">
              <div className="table-row table-header"><span>颜色</span><span>色号</span><span>库存状态</span><span>现有数量</span><span>安全库存</span><span>操作</span></div>
              {filteredInventory.map((item) => {
                const low = item.count < item.safe * 4;
                const preferred = activePreferredColorKeys.includes(colorKey(item.brand, item.code));
                return (
                  <div className={`table-row ${preferred ? "is-preferred" : ""}`} key={`${item.brand}-${item.code}`}>
                    <span className="color-name"><i style={{ background: item.color }} />{item.name}</span>
                    <span><b>{item.code}</b><small>{item.brand}</small></span>
                    <span><em className={preferred ? "status preferred" : low ? "status low" : "status good"}>{preferred ? "优先使用" : low ? "建议补充" : "充足"}</em></span>
                    <span className="count-control"><button aria-label={`减少${item.brand}${item.name}`} onClick={() => adjustInventory(item.brand, item.code, -10)}>−</button><input aria-label={`${item.brand} ${item.code} 现有数量`} type="number" min="0" value={item.count} onChange={(event) => setInventoryAmount(item.brand, item.code, "count", Number(event.target.value))} /><button aria-label={`增加${item.brand}${item.name}`} onClick={() => adjustInventory(item.brand, item.code, 10)}>＋</button></span>
                    <span><input className="stock-number-input" aria-label={`${item.brand} ${item.code} 安全库存`} type="number" min="0" value={item.safe} onChange={(event) => setInventoryAmount(item.brand, item.code, "safe", Number(event.target.value))} /><small>颗</small></span>
                    <span className="inventory-row-actions"><button className={`text-button ${preferred ? "active" : ""}`} aria-pressed={preferred} onClick={() => togglePreferredColor(item.brand, item.code)}>{preferred ? "取消优先" : "优先使用"}</button><button className="text-button delete" onClick={() => removeInventoryColor(item.brand, item.code)}>删除</button></span>
                  </div>
                );
              })}
              {!filteredInventory.length && <div className="inventory-empty"><span>⌕</span><b>{inventory.length ? "没有找到符合条件的色号" : "库存还是空的"}</b><small>{inventory.length ? "换个关键词或切换筛选条件试试" : "点击右上角“添加色号”开始录入"}</small></div>}
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
              {!visibleCatalog.length && <div className="catalog-empty">{selectedBrand === "PhotoPearls" ? "已收录官方 1–42 色号，屏幕参考色仍在校准，暂不开放入库。" : selectedCrossBrandColors.length || selectedBrand === "MARD" ? "没有找到匹配色号" : "该品牌色号正在收集与实物复核中"}</div>}
              <div className="catalog-pagination"><span>第 {activeCatalogPage + 1} / {catalogPageCount} 页 · 共 {filteredCatalog.length} 个色号</span><div><button disabled={activeCatalogPage === 0} onClick={() => setCatalogPage(Math.max(0, activeCatalogPage - 1))}>← 上一页</button><button disabled={activeCatalogPage === catalogPageCount - 1} onClick={() => setCatalogPage(Math.min(catalogPageCount - 1, activeCatalogPage + 1))}>下一页 →</button></div></div>
              {selectedBrand === "MARD" && <div className="catalog-source-note"><b>数据说明</b><span>HEX 仅供屏幕预览，不等于实物测色。289 项参考自 <a href="https://www.pixel-beads.com/mard-bead-color-chart" target="_blank" rel="noreferrer">PixelBeads 色卡</a>；公开列表缺少的 T2、T3 由 <a href="https://heybead.com/bead-colors" target="_blank" rel="noreferrer">HeyBead</a> 交叉补充，等待实物复核。</span></div>}
              {selectedCrossBrandColors.length > 0 && <div className="catalog-source-note"><b>数据说明</b><span>{selectedBrand} 的色号、名称与 RGB 参考自 MIT 开源项目 <a href="https://github.com/maxcleme/beadcolors" target="_blank" rel="noreferrer">BeadColors</a>。HEX 仅用于屏幕近似匹配，不代表品牌官方实物测色；不同批次、屏幕和光线均可能产生色差。</span></div>}
              {selectedBrand === "PhotoPearls" && <div className="catalog-source-note"><b>数据说明</b><span>已依据 <a href="https://www.photopearls.com/color-chart/" target="_blank" rel="noreferrer">PhotoPearls 官方色卡</a>记录 1–42 色号。官方页面未提供可直接用于算法的 RGB 数据，因此暂不虚构屏幕色，等待实物测色后开放匹配。</span></div>}
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
        <div className="workflow-shell">
          <CreatorJourney activeStep={uploadedImage ? 1 : 0} canCompare={Boolean(generatedPatterns)} onNavigate={go} />
          <div className="page create-page workflow-content">
          <section className="create-heading">
            <div><span className="step-tag">{uploadedImage ? "02 · 用色策略" : "01 · 准备图片"}</span><h1>{uploadedImage ? "决定用什么颜色完成" : "从一张喜欢的图片开始"}</h1><p>{uploadedImage ? "先设置库存、颜色数量与完成目标，再生成三套可比较方案。" : "我们会先确认主体与画布，再用你真正拥有的颜色重新绘制。"}</p></div>
            <aside className="create-setup-summary" aria-label="当前图纸设置">
              <span><b>{gridSize} × {gridSize}</b><small>画布</small></span>
              <span><b>{maxColors} 色</b><small>颜色上限</small></span>
              <span><b>{ignoreStock ? "完整色库" : `${inventory.length} 个库存色`}</b><small>用色范围</small></span>
            </aside>
          </section>
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
              <div className="setting-block image-treatment-setting">
                <label>图片处理 <span>{imageFit === "cover" ? "主体填满" : "保留完整图片"}</span></label>
                <p>根据图片类型选择合适方式，避免人物被压扁、横图被强行拉伸或像素边缘变糊。</p>
                <div className="image-fit-grid">
                  <button className={imageFit === "cover" ? "active" : ""} onClick={() => setImageFit("cover")}><i className="fit-cover" /><span><b>主体填满</b><small>居中裁切，适合头像与宠物</small></span></button>
                  <button className={imageFit === "contain" ? "active" : ""} onClick={() => setImageFit("contain")}><i className="fit-contain" /><span><b>保留完整图片</b><small>不裁边，空白处不放豆</small></span></button>
                </div>
                <div className="sampling-switch" aria-label="图片采样方式">
                  <button className={imageSampling === "smooth" ? "active" : ""} onClick={() => setImageSampling("smooth")}><b>照片 / 插画</b><small>平滑缩小，减少锯齿</small></button>
                  <button className={imageSampling === "pixel" ? "active" : ""} onClick={() => setImageSampling("pixel")}><b>像素原图</b><small>保留硬边，不混合相邻颜色</small></button>
                </div>
              </div>
              <div className="setting-block"><label>生成策略</label><div className="strategy-grid">
                {[{id:"zero",title:"零补货",desc:"完全使用现有库存"},{id:"balance",title:"平衡方案",desc:"允许少量补货"},{id:"quality",title:"效果优先",desc:"保留最多细节"}].map((item) => <button key={item.id} className={strategy === item.id ? "selected" : ""} onClick={() => setStrategy(item.id as Strategy)}><i /><b>{item.title}</b><small>{item.desc}</small></button>)}
              </div></div>
              <div className="setting-block color-count-setting">
                <label>颜色数量上限 <span>{maxColors} 种</span></label>
                <p>可在 3–264 色之间自由调整；颜色越少越容易拼，颜色越多越接近原图。</p>
                <div className="color-count-control">
                  <input aria-label="颜色数量上限" type="range" min="3" max="264" value={maxColors} onChange={(event) => setMaxColors(Number(event.target.value))} />
                  <label><input aria-label="输入颜色数量上限" type="number" min="3" max="264" value={maxColors} onChange={(event) => setMaxColors(Math.max(3, Math.min(264, Number(event.target.value) || 3)))} /><span>色</span></label>
                </div>
                <div className="color-count-grid" aria-label="选择图纸使用颜色种类">
                  {[3, 8, 16, 32, 64, 128, 192, 264].map((count) => <button key={count} className={maxColors === count ? "active" : ""} onClick={() => setMaxColors(count)}>{count}<small>色</small></button>)}
                </div>
                {maxColors >= 128 && <p className="color-count-warning">超精细配色会产生更多零散色块，建议搭配大画布，并在生成后使用“一键去杂色”。</p>}
              </div>
              <div className="setting-block color-selection-setting">
                <label>指定使用颜色 <span>{selectedGenerationColors.length ? `已选 ${selectedGenerationColors.length} 种` : "自动配色"}</span></label>
                <p>只让图纸使用你勾选的库存色；不选择时，系统会按策略自动挑色。</p>
                <button className={`color-picker-trigger ${showColorPicker ? "active" : ""}`} onClick={() => setShowColorPicker(!showColorPicker)}>
                  <span className="selected-color-preview">{selectedGenerationColors.slice(0, 8).map((item) => <i key={colorKey(item.brand, item.code)} style={{ background: item.color }} />)}{!selectedGenerationColors.length && <i className="auto-palette">∞</i>}</span>
                  <b>{selectedGenerationColors.length ? `管理已选 ${selectedGenerationColors.length} 种颜色` : "从库存中选择颜色"}</b><em>{showColorPicker ? "收起 ↑" : "展开 ↓"}</em>
                </button>
                {showColorPicker && <div className="allowed-color-panel">
                  <div className="allowed-color-actions"><span>当前库存共 {inventory.length} 个色号</span><div><button onClick={() => setSelectedColorKeys(inventory.map((item) => colorKey(item.brand, item.code)))}>全选库存色</button><button onClick={() => setSelectedColorKeys([])}>恢复自动</button></div></div>
                  <div className="allowed-color-grid">
                    {inventory.map((item) => {
                      const selected = activeSelectedColorKeys.includes(colorKey(item.brand, item.code));
                      return <button key={colorKey(item.brand, item.code)} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => toggleGenerationColor(item.brand, item.code)}><i style={{ background: item.color }} /><span><b>{item.code}</b><small>{item.brand} · {item.count} 颗</small></span><em>{selected ? "✓" : "+"}</em></button>;
                    })}
                  </div>
                  {activeSelectedColorKeys.length > 0 && activeSelectedColorKeys.length < 3 && <p className="color-selection-warning">还需选择 {3 - activeSelectedColorKeys.length} 种颜色才能生成。</p>}
                </div>}
              </div>
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
              <button className="generate-button" onClick={generate} disabled={isGenerating}>{isGenerating ? <><i className="spinner" /> 正在计算全局配色…</> : <>{selectedGenerationColors.length ? `按指定 ${selectedGenerationColors.length} 色生成` : ignoreStock ? "按完整色库生成图纸" : "生成库存适配图纸"} <span>→</span></>}</button>
              <p className="privacy-note">图片仅用于本次生成，不会公开到社区</p>
            </div>
          </section>
          </div>
        </div>
      )}

      {screen === "plans" && (
        <div className="workflow-shell">
          <CreatorJourney activeStep={2} canCompare={Boolean(generatedPatterns)} onNavigate={go} />
          <div className="page plans-page workflow-content">
          <section className="plans-heading"><div><span className="step-tag">03 · 方案对比</span><h1>同一张图，三种完成方式</h1><p>并排比较最终效果、用豆量和缺色风险。</p><small className="live-metrics-note">● 已按本次图片与当前库存实时计算</small></div><button className="secondary" onClick={() => go("create")}>← 调整设置</button></section>
          {colorShift !== "original" && <div className="color-shift-banner"><span>◐</span><div><b>已应用{({ warm: "偏暖", cool: "偏冷", bright: "提亮", soft: "柔和", original: "原图" } as Record<ColorShift, string>)[colorShift]}偏转</b><small>三套方案都基于修正后的色调匹配；如仍不合适，可返回切换其他方向。</small></div><button onClick={() => go("create")}>更换偏转</button></div>}
          {ignoreStock && <div className="ignore-stock-banner"><span>∞</span><div><b>已无视当前库存</b><small>下列方案按完整品牌色库生成；缺少的颜色不会被替换，并会加入采购清单。</small></div><button onClick={() => { setIgnoreStock(false); go("create"); }}>恢复库存约束</button></div>}
          <section className="plan-grid">
            {plans.map((plan) => {
              const metrics = metricsByPlan[plan.id];
              const supplyMessage = metrics.unfilled
                ? `库存不足，留空 ${metrics.unfilled} 格${metrics.shortage ? ` · 缺 ${metrics.shortage} 颗` : ""}`
                : metrics.shortage
                  ? `${ignoreStock ? "需购" : "缺"} ${metrics.shortage} 颗`
                  : "无需补货";
              return <article key={plan.id} className={`plan-card ${selectedPlan === plan.id ? "selected" : ""} ${recommendedPlan === plan.id ? "recommended" : ""}`} onClick={() => { setSelectedPlan(plan.id); setCellSelection(null); }}>
                <div className="plan-badge">{recommendedPlan === plan.id ? "本次推荐" : plan.eyebrow}</div>
                <div className="plan-art">{generatedPatterns ? <GeneratedArtwork cells={generatedPatterns[plan.id]} size={gridSize} /> : <BeadArtwork />}</div>
                <div className="plan-title"><div><h2>{plan.title}</h2><p>{plan.note}</p></div><span className="radio"><i /></span></div>
                <div className="score-row"><div><span>色彩还原</span><strong>{metrics.match}<small>分</small></strong></div><div><span>库存满足</span><strong>{metrics.stock}<small>%</small></strong></div></div>
                <div className="plan-meta"><span>{metrics.colors} 种颜色</span><span>{metrics.beads.toLocaleString()} 颗</span><span>{metrics.time}</span><span className={metrics.shortage || metrics.unfilled ? "short" : "enough"}>{supplyMessage}</span></div>
              </article>;
            })}
          </section>
          <section className="plan-footer panel">
            <div><span>已选择</span><h3>{currentPlan.title}</h3><p>{currentPlan.note}</p></div>
            <div className="usage-preview">{(generatedPatterns ? generatedUsage : inventory.slice(0, 5)).slice(0, 5).map((item) => <i key={`${item.brand}-${item.code}`} style={{ background: item.color }} />)}<span>共 {generatedPatterns ? currentPlanMetrics.colors : currentPlan.colors} 色 · {currentPlanMetrics.beads.toLocaleString()} 颗</span></div>
            <button className="primary" onClick={() => { if (gridSize > 58) setPatternView("section"); go("craft"); }}>使用这套图纸 <span>→</span></button>
          </section>
          </div>
        </div>
      )}

      {screen === "craft" && (
        <div className="workflow-shell">
          <CreatorJourney activeStep={projectCompleted ? 4 : 3} canCompare={Boolean(generatedPatterns)} onNavigate={go} />
          <div className="page craft-page workflow-content">
          <section className="craft-top">
            <div><span className="step-tag">{projectCompleted ? "05 · 导出制作" : "04 · 精修图纸"}</span><h1>{projectDisplayTitle}</h1><p>{currentPlan.title} · {generatedPatterns ? `${gridSize} × ${gridSize} · ${selectedPattern?.filter(Boolean).length ?? 0} 颗` : "15 × 15 · 225 颗"}{activeProjectId && <span className="autosave-state"> · ✓ 已自动保存</span>}</p></div>
            <div className="craft-actions"><button className="shopping-action" onClick={openShoppingList}>采购清单 <span>{purchaseItems.length}</span></button><div className={`speckle-tool ${speckleMaxSize > 6 ? "risky" : ""}`} title="数值越大，清理力度越强；高光、眼睛等小细节也可能被合并"><label><span>杂色块上限</span><input aria-label="要去除的最大杂色色块格数" type="number" min="1" max="20" value={speckleMaxSize} onChange={(event) => setSpeckleMaxSize(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /><em>格</em></label><button className="secondary despeckle-action" onClick={applySpeckleCleanup} disabled={!generatedPatterns}>✦ 一键去杂色（≤{speckleMaxSize}格）</button></div><button className="secondary" onClick={() => window.print()}>打印 / PDF</button><button className="secondary" onClick={() => { downloadPatternPng(craftPattern, craftSize, craftUsage, projectDisplayTitle); flash("高清 PNG 正在下载"); }}>导出高清 PNG</button><button className="primary" disabled={projectCompleted} onClick={finishProject}>{projectCompleted ? "✓ 已完成" : `完成${ignoreStock ? "作品" : "并扣库存"}`}</button></div>
          </section>
          <section className="craft-layout">
            <div className={`craft-canvas panel ${chartFocus ? "chart-focus" : ""}`}>
              <div className="canvas-toolbar">
                <div className="view-switch"><button className={patternView === "chart" ? "active" : ""} onClick={() => setPatternView("chart")}>完整图纸</button><button className={patternView === "section" ? "active" : ""} onClick={() => setPatternView("section")}>10×10 分区拼</button><button className={patternView === "preview" ? "active" : ""} onClick={() => setPatternView("preview")}>图纸总览</button></div>
                <div className="chart-tools">
                  <button className={editMode ? "active edit-toggle" : "edit-toggle"} aria-pressed={editMode} disabled={!generatedPatterns} onClick={toggleCellEditor}>✎ {editMode ? "退出修图" : "格子修图"}</button>
                  {patternView === "chart" && <><button aria-label="缩小图纸" onClick={() => setChartZoom(Math.max(.6, chartZoom - .2))}>−</button><strong>{Math.round(chartZoom * 100)}%</strong><button aria-label="放大图纸" onClick={() => setChartZoom(Math.min(2, chartZoom + .2))}>＋</button><button disabled={chartZoom === 1} onClick={() => setChartZoom(1)}>复位</button></>}
                  {patternView === "preview" && <><button aria-label="缩小总览" disabled={overviewZoom <= .5} onClick={() => setOverviewZoom(Math.max(.5, overviewZoom - .25))}>−</button><strong>{Math.round(overviewZoom * 100)}%</strong><button aria-label="放大总览" disabled={overviewZoom >= 3} onClick={() => setOverviewZoom(Math.min(3, overviewZoom + .25))}>＋</button><button onClick={() => {
                    const baseSize = Math.min(720, Math.max(360, craftSize * 8));
                    const viewportWidth = overviewViewportRef.current?.clientWidth ?? 720;
                    setOverviewZoom(Math.max(.5, Math.min(3, Math.round(((viewportWidth - 64) / baseSize) * 20) / 20)));
                  }}>适合窗口</button></>}
                  {replacementHistory.length > 0 && <button onClick={undoReplacement}>↶ 撤销上次操作</button>}
                  {redoHistory.length > 0 && <button onClick={redoReplacement}>↷ 重做</button>}
                  <button onClick={() => setChartFocus(!chartFocus)}>{chartFocus ? "退出全屏" : "专注查看"}</button>
                </div>
              </div>
              {editMode && generatedPatterns && <div className="cell-editor" aria-label="格子修图工具">
                <div className="cell-editor-tools">
                  <div><b>格子修图</b><span>点击、拖动或框选都可以精修</span></div>
                  <button className={editTool === "paint" ? "active" : ""} onClick={() => chooseEditTool("paint")}>● 画笔</button>
                  <button className={editTool === "fill" ? "active" : ""} onClick={() => chooseEditTool("fill")}>▣ 填充</button>
                  <button className={editTool === "erase" ? "active" : ""} onClick={() => chooseEditTool("erase")}>◇ 橡皮</button>
                  <button className={editTool === "pick" ? "active" : ""} onClick={() => chooseEditTool("pick")}>⌾ 吸管</button>
                  <button className={editTool === "select" ? "active" : ""} onClick={() => chooseEditTool("select")}>□ 框选</button>
                  <button className={`continuous-toggle ${continuousEdit ? "active" : ""}`} aria-pressed={continuousEdit} title="开启后按住画笔或橡皮拖动即可连续修改" onClick={() => setContinuousEdit(!continuousEdit)}>〰 连续涂画</button>
                  <button className={`mirror-toggle ${mirrorEdit ? "active" : ""}`} aria-pressed={mirrorEdit} title="开启后每次修改都会同步到左右对称位置" onClick={() => setMirrorEdit(!mirrorEdit)}>↔ 左右对称</button>
                </div>
                <div className="cell-editor-palette" aria-label="选择修图颜色">
                  {editPalette.map((item) => {
                    const active = (editTool === "paint" || editTool === "fill" || editTool === "select") && editColor?.code === item.code && (editColor.brand ?? "MARD") === item.brand;
                    return <button key={`${item.brand}-${item.code}`} className={active ? "active" : ""} title={`${item.brand} ${item.code} · ${item.name}`} onClick={() => { setEditColor({ brand: item.brand, code: item.code, color: item.color, name: item.name }); setEditTool(editTool === "fill" || editTool === "select" ? editTool : "paint"); }}><i style={{ background: item.color }} /><span><b>{item.code}</b><small>{item.brand}</small></span></button>;
                  })}
                </div>
                {editTool === "select" && <div className="cell-selection-actions" aria-live="polite">
                  <span>{!cellSelection ? "先点一个起点，再点一次确定矩形范围" : cellSelection.end === null ? "起点已选，请点击范围的另一角" : `已框选 ${selectedEditIndexes.size} 格`}</span>
                  <div>
                    <button disabled={!cellSelection || cellSelection.end === null} onClick={() => applyCellSelection(false)}>用当前颜色填满</button>
                    <button disabled={!cellSelection || cellSelection.end === null} onClick={() => applyCellSelection(true)}>清空所选格</button>
                    <button disabled={!cellSelection} onClick={() => setCellSelection(null)}>取消框选</button>
                  </div>
                </div>}
                <p>{editTool === "paint" ? `画笔颜色：${editColor?.brand ?? editPalette[0]?.brand ?? "—"} ${editColor?.code ?? editPalette[0]?.code ?? ""}${continuousEdit ? "，按住拖动可连续涂画" : ""}` : editTool === "fill" ? `填充颜色：${editColor?.brand ?? editPalette[0]?.brand ?? "—"} ${editColor?.code ?? editPalette[0]?.code ?? ""}，点击连续同色区域即可整片替换` : editTool === "erase" ? `橡皮会把格子变为空白${continuousEdit ? "，按住拖动可连续擦除" : ""}` : editTool === "select" ? "框选完成后可用当前颜色填满或一键清空" : "点一下图纸中的颜色即可吸取"}{mirrorEdit ? " · 左右对称已开启" : ""} · 每次修改都会自动保存，也可以撤销或重做</p>
              </div>}
              {patternView === "chart" ? (
                <div className="chart-stage">
                  <div className="chart-title"><div><b>{projectDisplayTitle}</b><span>{craftSize} × {craftSize} · 每格均标注品牌色号</span></div><em>每 5 格橙色分区</em></div>
                  <PatternChart cells={displayPattern} size={craftSize} zoom={chartZoom} highlight={replacementPreview ? null : chartHighlight} editable={editMode} dragEditable={editMode && continuousEdit && (editTool === "paint" || editTool === "erase")} selectedIndexes={selectedEditIndexes} onCellEdit={handleCellEdit} onCellStrokeStart={handleCellStrokeStart} onCellStrokeMove={handleCellStrokeMove} onCellStrokeEnd={handleCellStrokeEnd} onZoomChange={editMode ? undefined : setChartZoom} />
                  <div className="pattern-legend" aria-label="图纸颜色用量">
                    {craftUsage.map((item) => <button key={`${item.brand}-${item.code}`} onClick={() => { setReplacementPreview(null); if (editMode) { setEditColor({ brand: item.brand, code: item.code, color: item.color, name: item.name }); setEditTool(editTool === "select" ? "select" : "paint"); } else { setHighlight(highlight === item.code ? null : item.code); } }} style={{ background: item.color, color: textColor(item.color) }}><b>{item.code}</b><span>{item.brand} · {item.name}</span><strong>{editMode ? "设为修图颜色" : `${item.count} 颗`}</strong></button>)}
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
                    <PatternChart cells={displayPattern} size={craftSize} zoom={1.45} highlight={replacementPreview ? null : chartHighlight} startRow={sectionStartRow} startColumn={sectionStartColumn} rowCount={sectionHeight} columnCount={sectionWidth} editable={editMode} dragEditable={editMode && continuousEdit && (editTool === "paint" || editTool === "erase")} selectedIndexes={selectedEditIndexes} onCellEdit={handleCellEdit} onCellStrokeStart={handleCellStrokeStart} onCellStrokeMove={handleCellStrokeMove} onCellStrokeEnd={handleCellStrokeEnd} />
                  </div>
                  <div className="section-pagination">
                    <button disabled={activeSectionRow === 0 && activeSectionColumn === 0} onClick={() => { const index = activeSectionRow * sectionColumnCount + activeSectionColumn - 1; setSectionRow(Math.floor(index / sectionColumnCount)); setSectionColumn(index % sectionColumnCount); }}>← 上一区</button>
                    <span>{activeSectionRow * sectionColumnCount + activeSectionColumn + 1} / {sectionRowCount * sectionColumnCount}</span>
                    <button disabled={activeSectionRow === sectionRowCount - 1 && activeSectionColumn === sectionColumnCount - 1} onClick={() => { const index = activeSectionRow * sectionColumnCount + activeSectionColumn + 1; setSectionRow(Math.floor(index / sectionColumnCount)); setSectionColumn(index % sectionColumnCount); }}>下一区 →</button>
                  </div>
                </div>
              ) : (
                <div className="overview-stage">
                  <div className="overview-title"><div><b>整张图纸一览</b><span>拖动画布查看局部，125% 以上显示逐格网线</span></div><em>{replacementPreview ? `正在预览 ${replacementPreview.fromCode} → ${replacementPreview.toCode}` : "每 5 格橙色分区"}</em></div>
                  <div className="overview-viewport touch-zoom-viewport" ref={overviewViewportRef}>
                    <div className="overview-canvas-frame">
                      <PatternOverview cells={displayPattern} size={craftSize} zoom={overviewZoom} highlight={replacementPreview ? null : previewHighlight} />
                    </div>
                  </div>
                  <div className="overview-stats"><span><b>{craftSize} × {craftSize}</b><small>画布尺寸</small></span><span><b>{displayPattern.filter(Boolean).length.toLocaleString()}</b><small>豆子总数</small></span><span><b>{craftUsage.length}</b><small>使用颜色</small></span><span><b>{Math.round(overviewZoom * 100)}%</b><small>当前缩放</small></span></div>
                </div>
              )}
              <div className="coordinate-hint">{editMode ? "修图模式：点击或轻触格子修改；画笔颜色也可从下方图例直接选择" : patternView === "preview" ? "手机可双指缩放、单指拖动，双击恢复 100%；也可使用上方按钮" : patternView === "chart" ? "手机可双指缩放、单指滚动，双击恢复 100%；点击右侧颜色可高亮色号" : "可横向、纵向滚动查看；点击右侧颜色可高亮该色号"}</div>
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
                  {replacementBrands.map((brand) => <button key={brand} className={replacementBrand === brand ? "active" : ""} onClick={() => { setReplacementBrand(brand); setReplacementPreview(null); }}><b>{brand}</b><small>{brand === "MARD" ? 291 : crossBrandColors.filter((item) => item.brand === brand).length} 色</small></button>)}
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

      {showInventoryAdder && (
        <div className="shopping-backdrop" onMouseDown={() => setShowInventoryAdder(false)}>
          <section className="shopping-dialog inventory-adder-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-adder-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="shopping-head">
              <div><span className="step-tag">从标准色卡录入</span><h2 id="inventory-adder-title">添加库存色号</h2><p>先设定本次录入数量，再点击拥有的颜色；已存在的色号会直接累加。</p></div>
              <button aria-label="关闭添加色号" onClick={() => setShowInventoryAdder(false)}>×</button>
            </header>
            <div className="inventory-add-settings">
              <label><span>每次加入</span><input aria-label="每次加入库存数量" type="number" min="0" value={inventoryAddCount} onChange={(event) => setInventoryAddCount(Math.max(0, Number(event.target.value) || 0))} /><em>颗</em></label>
              <label><span>安全预留</span><input aria-label="新色号安全库存" type="number" min="0" value={inventoryAddSafe} onChange={(event) => setInventoryAddSafe(Math.max(0, Number(event.target.value) || 0))} /><em>颗</em></label>
              <small>安全预留不会被自动分配给新图纸。</small>
            </div>
            <div className="inventory-brand-switch" aria-label="选择拼豆品牌">
              {replacementBrands.map((brand) => <button key={brand} className={inventoryAdderBrand === brand ? "active" : ""} onClick={() => { setInventoryAdderBrand(brand); setInventoryAdderQuery(""); }}>{brand}</button>)}
            </div>
            <label className="inventory-adder-search">⌕ <input aria-label="搜索要添加的色号" placeholder={`搜索 ${inventoryAdderBrand} 色号、名称或 HEX`} value={inventoryAdderQuery} onChange={(event) => setInventoryAdderQuery(event.target.value)} /></label>
            <div className="inventory-adder-grid">
              {visibleInventoryAdderColors.map((item) => {
                const existing = inventoryKeys.has(colorKey(item.brand, item.code));
                return <button className={existing ? "existing" : ""} key={`${item.brand}-${item.code}`} onClick={() => addInventoryColor(item)} title={`${item.brand} ${item.code} · ${item.color}`}><i style={{ background: item.color }} /><span><b>{item.code}</b><small>{item.name}</small></span><em>{existing ? `再加 ${inventoryAddCount}` : "＋ 加入"}</em></button>;
              })}
              {!visibleInventoryAdderColors.length && <div className="inventory-adder-empty">没有找到匹配色号</div>}
            </div>
            <footer className="shopping-footer inventory-adder-footer"><span>当前库存 {inventory.length} 色 · 共 {totalStock.toLocaleString()} 颗</span><button onClick={() => setShowInventoryAdder(false)}>完成录入</button><button className="receive-list" onClick={() => { setShowInventoryAdder(false); setSelectedBrand(inventoryAdderBrand); setCatalogQuery(""); setCatalogPage(0); go("catalog"); }}>查看完整色卡资料</button></footer>
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
              }) : <div className="projects-empty"><span>▦</span><h3>还没有保存的作品</h3><p>生成第一张图纸后，系统会自动开始保存。</p></div>}
            </div>
            <footer className="shopping-footer projects-footer"><button onClick={() => setShowProjects(false)}>关闭</button><button className="receive-list" onClick={startNewProject}>＋ 新建作品</button></footer>
          </section>
        </div>
      )}

      <PrintPatternBook cells={craftPattern} size={craftSize} usage={craftUsage} title={projectDisplayTitle} />

      <nav className="mobile-nav" aria-label="移动端导航">
        <button className={screen === "home" ? "active" : ""} onClick={() => go("home")}><span>⌂</span>首页</button>
        <button className={screen === "inventory" ? "active" : ""} onClick={() => go("inventory")}><span>◫</span>库存</button>
        <button className="mobile-create" onClick={() => go("create")}><span>＋</span></button>
        <button className={screen === "craft" ? "active" : ""} onClick={() => go("craft")}><span>▦</span>制作</button>
        <button className={screen === "catalog" ? "active" : ""} onClick={() => go("catalog")}><span>◉</span>色库</button>
      </nav>
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
