"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="formal-error-page">
      <div>
        <span>作品数据仍保存在本机</span>
        <h1>这个页面刚刚卡住了</h1>
        <p>可以重新载入当前界面；如果反复出现，请先回到首页并导出完整备份。</p>
        <button onClick={reset}>重新载入</button>
        <a href="./">回到首页</a>
      </div>
    </main>
  );
}
