"use client";

import { ChangeEvent, CSSProperties, useMemo, useRef, useState } from "react";

type Screen = "home" | "inventory" | "catalog" | "create" | "plans" | "craft";
type Strategy = "zero" | "balance" | "quality";

const swatches = [
  { code: "M1", name: "奶油白", color: "#f5eddb", count: 386, safe: 80 },
  { code: "M4", name: "暖杏", color: "#efb77d", count: 246, safe: 40 },
  { code: "M7", name: "蜜桃粉", color: "#e98d8c", count: 184, safe: 30 },
  { code: "C5", name: "姜黄色", color: "#d89b42", count: 512, safe: 80 },
  { code: "C9", name: "榛果棕", color: "#8b5e45", count: 127, safe: 30 },
  { code: "A3", name: "鼠尾草", color: "#91a487", count: 298, safe: 60 },
  { code: "A8", name: "湖水蓝", color: "#69aeb1", count: 96, safe: 25 },
  { code: "N2", name: "炭黑", color: "#35302e", count: 431, safe: 100 },
];

const brandCatalog = [
  { name: "MARD", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "标准 221 + 扩展系列", state: "已建档", tone: "#536d58" },
  { name: "Artkal", origin: "国际品牌", series: "S · C · A · R · M", coverage: "硬豆、软豆与多尺寸", state: "已建档", tone: "#cb7d5a" },
  { name: "Perler", origin: "国际品牌", series: "Classic · Mini · Caps", coverage: "常规与特殊材质", state: "已建档", tone: "#d5a13b" },
  { name: "Hama", origin: "国际品牌", series: "Mini · Midi · Maxi · Bio", coverage: "全尺寸共用色号体系", state: "已建档", tone: "#739a9c" },
  { name: "Nabbi", origin: "国际品牌", series: "Midi · Mini", coverage: "常用色与透明系列", state: "校准中", tone: "#8c779d" },
  { name: "Yant", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "基础与扩展色板", state: "校准中", tone: "#b66b70" },
  { name: "COCO 可可", origin: "国内常用", series: "5 mm · 2.6 mm", coverage: "常用套装与单色", state: "待复核", tone: "#9c745c" },
  { name: "漫漫", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#708c72" },
  { name: "盼盼拼豆", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#bf7658" },
  { name: "卡卡家", origin: "国内常用", series: "多尺寸", coverage: "常用套装与单色", state: "待复核", tone: "#687f98" },
];

const catalogColors = [
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
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentPlan = plans.find((plan) => plan.id === selectedPlan) ?? plans[0];
  const totalStock = useMemo(() => swatches.reduce((sum, item) => sum + item.count, 0), []);
  const progress = Math.round((completedColors.length / 5) * 100);

  function go(next: Screen) {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
  }

  function generate() {
    setIsGenerating(true);
    window.setTimeout(() => {
      setSelectedPlan(strategy);
      setIsGenerating(false);
      go("plans");
    }, 850);
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
                {swatches.slice(0, 7).map((item) => <i key={item.code} style={{ background: item.color }} title={item.name} />)}
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
            <div className="title-actions"><button className="secondary" onClick={() => flash("库存表模板已准备")}>导入表格</button><button className="primary" onClick={() => flash("已打开添加色号入口")}>＋ 添加色号</button></div>
          </section>
          <section className="inventory-overview">
            <div><span>库存总量</span><strong>{totalStock.toLocaleString()}<small> 颗</small></strong><em>较上次作品 -215</em></div>
            <div><span>已录入色号</span><strong>8<small> 种</small></strong><em>覆盖常用色 72%</em></div>
            <div><span>低于安全线</span><strong>2<small> 种</small></strong><em className="warning">需要留意</em></div>
            <div><span>可直接完成</span><strong>5<small> 张</small></strong><em>来自灵感夹</em></div>
          </section>
          <section className="panel inventory-table-wrap">
            <div className="table-toolbar"><div><button className="chip active">全部 8</button><button className="chip">库存偏低 2</button><button className="chip">优先消耗 1</button></div><label className="search">⌕ <input aria-label="搜索色号" placeholder="搜索色号或颜色" /></label></div>
            <div className="inventory-table">
              <div className="table-row table-header"><span>颜色</span><span>色号</span><span>库存状态</span><span>现有数量</span><span>安全库存</span><span>操作</span></div>
              {swatches.map((item, index) => {
                const low = item.count < item.safe * 4;
                return (
                  <div className="table-row" key={item.code}>
                    <span className="color-name"><i style={{ background: item.color }} />{item.name}</span>
                    <span><b>{item.code}</b><small>MARD</small></span>
                    <span><em className={low ? "status low" : "status good"}>{low ? "建议补充" : index === 3 ? "优先消耗" : "充足"}</em></span>
                    <span className="count-control"><button aria-label={`减少${item.name}`}>−</button><b>{item.count}</b><button aria-label={`增加${item.name}`}>＋</button></span>
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
                  <button key={brand.name} className={selectedBrand === brand.name ? "active" : ""} onClick={() => setSelectedBrand(brand.name)}>
                    <i style={{ background: brand.tone }}>{brand.name.slice(0, 1)}</i>
                    <span><b>{brand.name}</b><small>{brand.origin} · {brand.series}</small></span>
                    <em className={brand.state === "已建档" ? "ready" : "pending"}>{brand.state}</em>
                  </button>
                ))}
              </div>
            </aside>

            <div className="panel color-browser">
              <div className="color-browser-head">
                <div><span>当前色卡</span><h2>{selectedBrand}</h2><p>{brandCatalog.find((brand) => brand.name === selectedBrand)?.coverage}</p></div>
                <div className="version-pill"><i /> 色卡版本 2026.07</div>
              </div>
              <div className="catalog-toolbar">
                <div><button className="chip active">全部颜色</button><button className="chip">基础色</button><button className="chip">透明</button><button className="chip">夜光 / 特殊</button></div>
                <label className="search">⌕ <input aria-label="搜索品牌色号" placeholder="输入色号" /></label>
              </div>
              <div className="master-swatches">
                {catalogColors.map(([code, color]) => (
                  <button key={code} onClick={() => flash(`${selectedBrand} ${code} 已加入我的豆仓`)}>
                    <i style={{ background: color }}><span /></i><b>{code}</b><small>加入库存</small>
                  </button>
                ))}
              </div>
              <div className="catalog-pagination"><span>示意展示 24 个色号</span><button onClick={() => flash("正式版会加载该品牌的完整在售及历史色号")}>查看完整色卡 →</button></div>
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
              <div className="setting-block"><label>成品尺寸 <span>29 × 29</span></label><input type="range" min="15" max="58" defaultValue="29" /><div className="range-label"><span>15</span><span>29</span><span>58</span></div></div>
              <div className="setting-block"><label>生成策略</label><div className="strategy-grid">
                {[{id:"zero",title:"零补货",desc:"完全使用现有库存"},{id:"balance",title:"平衡方案",desc:"允许少量补货"},{id:"quality",title:"效果优先",desc:"保留最多细节"}].map((item) => <button key={item.id} className={strategy === item.id ? "selected" : ""} onClick={() => setStrategy(item.id as Strategy)}><i /><b>{item.title}</b><small>{item.desc}</small></button>)}
              </div></div>
              <div className="setting-row"><div><label>最大颜色数</label><p>减少零散色块，更容易制作</p></div><select aria-label="最大颜色数" defaultValue="12"><option>8 种</option><option>12 种</option><option>16 种</option></select></div>
              <div className="setting-row"><div><label>主体优化</label><p>强化五官与外轮廓</p></div><button className="toggle on" aria-label="开启主体优化"><i /></button></div>
              <div className="setting-row"><div><label>保留安全库存</label><p>不消耗常用色的保留颗数</p></div><button className="toggle on" aria-label="开启保留安全库存"><i /></button></div>
              <button className="generate-button" onClick={generate} disabled={isGenerating}>{isGenerating ? <><i className="spinner" /> 正在计算全局配色…</> : <>生成库存适配图纸 <span>→</span></>}</button>
              <p className="privacy-note">图片仅用于本次生成，不会公开到社区</p>
            </div>
          </section>
        </div>
      )}

      {screen === "plans" && (
        <div className="page plans-page">
          <section className="plans-heading"><div><span className="step-tag">02 · 选择方案</span><h1>同一张图，三种完成方式</h1><p>先看效果，也看清需要多少豆。</p></div><button className="secondary" onClick={() => go("create")}>← 调整设置</button></section>
          <section className="plan-grid">
            {plans.map((plan) => (
              <article key={plan.id} className={`plan-card ${selectedPlan === plan.id ? "selected" : ""}`} onClick={() => setSelectedPlan(plan.id)}>
                <div className="plan-badge">{plan.eyebrow}</div>
                <div className="plan-art"><BeadArtwork /></div>
                <div className="plan-title"><div><h2>{plan.title}</h2><p>{plan.note}</p></div><span className="radio"><i /></span></div>
                <div className="score-row"><div><span>还原度</span><strong>{plan.match}<small>分</small></strong></div><div><span>库存满足</span><strong>{plan.stock}<small>%</small></strong></div></div>
                <div className="plan-meta"><span>{plan.colors} 种颜色</span><span>{plan.time}</span><span className={plan.shortage ? "short" : "enough"}>{plan.shortage ? `缺 ${plan.shortage} 颗` : "无需补货"}</span></div>
              </article>
            ))}
          </section>
          <section className="plan-footer panel">
            <div><span>已选择</span><h3>{currentPlan.title}</h3><p>{currentPlan.note}</p></div>
            <div className="usage-preview">{swatches.slice(0, 5).map((item) => <i key={item.code} style={{ background: item.color }} />)}<span>共 {currentPlan.colors} 色</span></div>
            <button className="primary" onClick={() => go("craft")}>使用这套图纸 <span>→</span></button>
          </section>
        </div>
      )}

      {screen === "craft" && (
        <div className="page craft-page">
          <section className="craft-top">
            <div><span className="step-tag">03 · 制作模式</span><h1>橘猫午后</h1><p>{currentPlan.title} · 15 × 15 · 225 颗</p></div>
            <div className="craft-actions"><button className="secondary" onClick={() => flash("图纸 PNG 已准备导出")}>导出图纸</button><button className="primary" onClick={() => flash("作品已完成，库存已扣减 225 颗")}>完成并扣库存</button></div>
          </section>
          <section className="craft-layout">
            <div className="craft-canvas panel">
              <div className="canvas-toolbar"><div><button className="active">图纸</button><button>色号</button><button>预览</button></div><span>＋ &nbsp; 100% &nbsp; −</span></div>
              <div className="large-art"><BeadArtwork highlight={highlight} /></div>
              <div className="coordinate-hint">点击右侧颜色，只查看该色号的位置</div>
            </div>
            <aside className="craft-sidebar panel">
              <div className="progress-head"><div><span>制作进度</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><p>{completedColors.length} / 5 个颜色已完成</p></div>
              <div className="color-tasks">
                {[
                  { key: "n", code: "N2", name: "炭黑", count: 68, color: "#35302e" },
                  { key: "c", code: "C5", name: "姜黄色", count: 96, color: "#d89b42" },
                  { key: "o", code: "M1", name: "奶油白", count: 18, color: "#f5eddb" },
                  { key: "p", code: "M7", name: "蜜桃粉", count: 12, color: "#e98d8c" },
                  { key: "s", code: "A3", name: "鼠尾草", count: 31, color: "#91a487" },
                ].map((item) => {
                  const done = completedColors.includes(item.key);
                  return <button key={item.key} className={`${highlight === item.key ? "active" : ""} ${done ? "done" : ""}`} onClick={() => setHighlight(highlight === item.key ? null : item.key)}><i style={{ background: item.color }} /><span><b>{item.code} · {item.name}</b><small>{item.count} 颗</small></span><em onClick={(event) => { event.stopPropagation(); setCompletedColors(done ? completedColors.filter((key) => key !== item.key) : [...completedColors, item.key]); }}>{done ? "✓" : "○"}</em></button>;
                })}
              </div>
              <div className="smart-tip"><span>✦</span><div><b>库存提醒</b><p>完成后还会剩 334 颗炭黑，安全库存充足。</p></div></div>
            </aside>
          </section>
        </div>
      )}

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
