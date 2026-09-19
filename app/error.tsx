"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel empty">
      <h1>暫時無法顯示此頁</h1>
      <p>請重新載入。你的本機命盤不會因此刪除。</p>
      <button className="button primary" onClick={reset}>
        重新嘗試
      </button>
    </section>
  );
}
