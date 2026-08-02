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
  assert.match(page, /type InventoryFilter = "all" \| "low" \| "preferred"/);
  assert.match(page, /function addInventoryColor/);
  assert.match(page, /function removeInventoryColor/);
  assert.match(page, /yilihua-inventory-preferences-v1/);
  assert.match(page, /添加库存色号/);
  assert.match(page, /preferredColors\.has/);
  assert.match(page, /function ImageCropper/);
  assert.match(page, /裁出要拼的主体/);
  assert.match(page, /canvas\.toDataURL\("image\/png"\)/);
  assert.match(page, /重新裁剪/);
  assert.match(page, /type PortableProjectPackage/);
  assert.match(page, /function importProjectPackage/);
  assert.match(page, /navigator\.canShare/);
  assert.match(page, /\.yilihua/);
  assert.match(page, /文字消除/);
  assert.match(page, /crop-erase-mask/);
  assert.match(page, /globalCompositeOperation = "destination-in"/);
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
  assert.match(css, /\.inventory-adder-grid\s*\{/);
  assert.match(css, /\.table-row\.is-preferred/);
  assert.match(css, /\.crop-viewport\s*\{/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /\.crop-editor-mode\s*\{/);
  assert.match(css, /\.crop-erase-mask\s*\{/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /一粒画｜把喜欢，一粒粒拼出来/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.deepEqual(await readdir(new URL("app/_sites-preview", templateRoot)), []);
});

test("ships an installable offline app with mobile image capture and safe local drafts", async () => {
  const [page, css, layout, manifestText, serviceWorker] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.name, "一粒画｜拼豆创作台");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.match(layout, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(page, /beforeinstallprompt/);
  assert.match(page, /serviceWorker\.register/);
  assert.match(page, /navigator\.clipboard\?\.read/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /navigator\.storage\?\.estimate/);
  assert.match(page, /yilihua-creation-draft-v1/);
  assert.match(page, /一粒画在这台设备上/);
  assert.match(page, /function undoEraseMask/);
  assert.match(page, /对照原图/);
  assert.match(page, /function removeConnectedBackground/);
  assert.match(page, /cornerBackgroundSamples/);
  assert.match(page, /自动识别四角背景/);
  assert.match(page, /背景清理强度/);
  assert.match(page, /setBackgroundSample/);
  assert.match(page, /context\.putImageData\(removeConnectedBackground/);
  assert.match(css, /\.crop-background-preview/);
  assert.match(css, /\.crop-background-controls/);
  assert.match(serviceWorker, /yilihua-shell-v2/);
  assert.match(serviceWorker, /SKIP_WAITING/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
});
