import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the 一粒画 product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /<title>一粒画｜把喜欢，一粒粒拼出来<\/title>/i);
  assert.match(html, /把喜欢/);
  assert.match(html, /开始图片转拼豆/);
  assert.match(html, /我的库存/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("ships the finished product and cell editor without starter artifacts", async () => {
  const [css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type CellEditTool = "paint" \| "erase" \| "pick" \| "fill" \| "select"/);
  assert.match(page, /function handleCellEdit/);
  assert.match(page, /function handleCellStrokeStart/);
  assert.match(page, /function applyCellSelection/);
  assert.match(page, /function redoReplacement/);
  assert.match(page, /mirrorEdit/);
  assert.match(page, /type ImageFit = "cover" \| "contain"/);
  assert.match(page, /type ImageSampling = "smooth" \| "pixel"/);
  assert.match(page, /alpha < \.25/);
  assert.match(page, /function measurePixelImportance/);
  assert.match(page, /function selectUsefulPaletteIndexes/);
  assert.match(page, /function findNearestPaletteCandidates/);
  assert.match(page, /const prepared = await preparePatternPixels/);
  assert.match(page, /remaining\[paletteIndex\] <= 0/);
  assert.match(page, /function calculatePlanMetrics/);
  assert.match(page, /const metricsByPlan = useMemo/);
  assert.match(page, /const recommendedPlan = useMemo<Strategy>/);
  assert.match(page, /已按本次图片与当前库存实时计算/);
  assert.match(page, /metrics\.beads\.toLocaleString\(\)/);
  assert.match(page, /function usePinchZoom/);
  assert.match(page, /touchmove", move, \{ passive: false \}/);
  assert.match(page, /onZoomChange=\{editMode \? undefined : setChartZoom\}/);
  assert.match(page, /手机可双指缩放/);
  assert.match(page, /保留完整图片/);
  assert.match(page, /区域填充/);
  assert.match(page, /格子修图/);
  assert.match(page, /editable=\{editMode\}/);
  assert.match(css, /\.cell-editor\s*\{/);
  assert.match(css, /\.chart-cell\.editable/);
  assert.match(css, /\.cell-selection-actions/);
  assert.match(css, /\.chart-cell\.selected-cell/);
  assert.match(css, /\.touch-zoom-viewport\s*\{/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /一粒画｜把喜欢，一粒粒拼出来/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.deepEqual(await readdir(new URL("app/_sites-preview", templateRoot)), []);
});
