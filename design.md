# Design · 一粒画

这是“一粒画”正式版的锁定设计系统。所有界面沿用同一套颜色、字体、间距、交互和产品语气。

## Genre

Modern-minimal（playful craft tone）：可爱但不幼稚，轻盈但不空洞，产品功能永远比装饰更醒目。

## Macrostructure family

- 首页：Task-first Launchpad。一个明确的图片入口，随后是最近作品、库存状态和三步说明。
- 应用界面：Workbench。左侧素材与设置，右侧结果与操作；复杂功能按任务逐步展开。
- 内容界面：Compact Guide。短段落、真实状态和直接操作，不使用大段营销文案。

## Theme

- `--color-paper`: `oklch(98.3% 0.009 348)`
- `--color-paper-2`: `oklch(96.5% 0.018 344)`
- `--color-ink`: `oklch(27% 0.028 342)`
- `--color-ink-2`: `oklch(48% 0.025 342)`
- `--color-rule`: `oklch(90.5% 0.021 345)`
- `--color-accent`: `oklch(64% 0.19 350)`
- `--color-focus`: `oklch(56% 0.18 303)`

主色莓粉只用于主行动、当前状态和关键进度；紫粉渐变只允许出现在首页主入口，不铺满页面。

## Typography

- Display：`ui-rounded / PingFang SC / Microsoft YaHei`，700–850，正体。
- Body：`Microsoft YaHei / PingFang SC / Noto Sans SC`，400–700。
- Mono：`Cascadia Mono / SFMono-Regular / Consolas`，用于色号和坐标。
- 标题不使用斜体，长标题必须允许自然换行。

## Spacing

使用 `tokens.css` 的 4pt 命名间距。卡片内部以 `--space-md` 为基准；大区块之间以 `--space-xl` 为基准。

## Motion

- 只动 `transform` 与 `opacity`。
- 成功反馈保持安静；不使用庆祝动画。
- `prefers-reduced-motion` 下收敛为不超过 150ms 的透明度变化。

## Microinteractions stance

- 主要操作立即响应，并给出明确文字状态。
- 可恢复操作优先提供撤销，不用多余确认框。
- 键盘焦点始终可见；点击目标在手机上不小于 44px。

## CTA voice

- 主按钮：实心莓粉、圆角矩形、动词开头，例如“开始图片转拼豆”。
- 次按钮：白色或浅粉底、细边框、清楚说明差异，例如“无视库存生成”。
- 不用夸张承诺和虚构数据。

## Per-page allowances

- 首页可以使用一处轻量渐变和纯 CSS 拼豆示意。
- 工作台不使用装饰性大背景；功能本身承担视觉重点。
- 图纸、色号、数量和缺色状态必须保持高对比。

## What pages MUST share

- “一粒画”字标、莓粉主色、同一字体栈和按钮语气。
- 本机保存、无需登录、可离线的可信说明。
- 统一的面板、表单、焦点和错误反馈。

## What pages MAY differ on

- 首页更温柔；创作和制作界面更克制、更高密度。
- 图纸区可采用黑白高对比网格，不受首页浅粉底色限制。

## Exports

### tokens.css

正式令牌位于项目根目录 `tokens.css`，由 `app/globals.css` 导入。

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98.3% 0.009 348);
  --color-ink: oklch(27% 0.028 342);
  --color-accent: oklch(64% 0.19 350);
  --font-display: ui-rounded, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --font-body: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;
  --spacing-md: 1.5rem;
  --text-md: 1rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

配套机器可读令牌位于项目根目录 `tokens.json`。

### shadcn/ui CSS variables

```css
:root {
  --background: 98.3% 0.009 348;
  --foreground: 27% 0.028 342;
  --primary: 64% 0.19 350;
  --primary-foreground: 100% 0 0;
  --muted: 96.5% 0.018 344;
  --muted-foreground: 48% 0.025 342;
  --border: 90.5% 0.021 345;
  --input: 90.5% 0.021 345;
  --ring: 56% 0.18 303;
  --radius: 0.875rem;
}
```
