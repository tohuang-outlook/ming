"use client";
import { useState } from "react";
import { PageTitle, ErrorNotice } from "@/components/ui";
import {
  calculateIChing,
  randomToss,
  type Toss,
  type IChingChart,
} from "@/lib/iching";
import { IChingView } from "@/components/chart-views";
import { ChartActions } from "@/components/chart-actions";
export default function IChingPage() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [tosses, setTosses] = useState<Toss[]>([]);
  const [coins, setCoins] = useState<Toss>([2, 2, 2]);
  const [chart, setChart] = useState<IChingChart | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  function add() {
    try {
      const next = [...tosses, mode === "auto" ? randomToss() : coins];
      setTosses(next);
      if (next.length === 6) setChart(calculateIChing(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "投擲失敗，請重試。");
    }
  }
  function reset() {
    setTosses([]);
    setChart(null);
    setStarted(false);
    setError("");
  }
  return (
    <>
      <PageTitle
        eyebrow="THE BOOK OF CHANGES"
        title="易經卜卦"
        description="靜下心，把眼前的疑問化為一個清楚的問題。"
      />
      <ErrorNotice message={error} />
      {!chart ? (
        <div className="two-col">
          <section className="panel form-panel">
            <label>
              你想問什麼？
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：對於這次工作的轉變，我可以如何準備？"
                maxLength={1000}
                rows={4}
                disabled={started}
              />
            </label>
            <div className="segmented">
              <button
                onClick={() => setMode("auto")}
                aria-pressed={mode === "auto"}
                disabled={started}
              >
                自動擲銅錢
              </button>
              <button
                onClick={() => setMode("manual")}
                aria-pressed={mode === "manual"}
                disabled={started}
              >
                手動擲銅錢
              </button>
            </div>
            {!started ? (
              <button
                className="button primary wide"
                disabled={!question.trim()}
                onClick={() => setStarted(true)}
              >
                開始卜卦 →
              </button>
            ) : (
              <>
                <div className="casting">
                  <span className="eyebrow">
                    第 {tosses.length + 1} 次 ·{" "}
                    {
                      ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][
                        tosses.length
                      ]
                    }
                  </span>
                  <div className="coins">
                    {coins.map((v, i) => (
                      <button
                        key={i}
                        className="coin"
                        disabled={mode === "auto"}
                        aria-label={`第 ${i + 1} 枚：${v === 3 ? "正面 3" : "反面 2"}，點擊翻面`}
                        onClick={() =>
                          setCoins(
                            coins.map((c, j) =>
                              j === i ? (c === 2 ? 3 : 2) : c,
                            ) as Toss,
                          )
                        }
                      >
                        {mode === "auto" ? "通" : v === 3 ? "正" : "反"}
                        <small>{mode === "auto" ? "寶" : v}</small>
                      </button>
                    ))}
                  </div>
                  <p className="muted small">
                    {mode === "manual"
                      ? "點擊每枚銅錢輸入正反面，再確認本次結果。"
                      : "以裝置安全亂數擲出三枚銅錢，每次建立一爻。"}
                  </p>
                  <button className="button primary" onClick={add}>
                    {mode === "manual" ? "確認本次結果" : "擲出三枚銅錢"}
                  </button>
                </div>
                <ol className="toss-list">
                  {tosses.map((t, i) => (
                    <li key={i}>
                      <span>第 {i + 1} 次</span>
                      <strong>
                        {t.join(" + ")} = {t.reduce((a, b) => a + b, 0)}
                      </strong>
                    </li>
                  ))}
                </ol>
                <button className="text-button" onClick={reset}>
                  重新開始
                </button>
              </>
            )}
          </section>
          <aside className="panel info-panel">
            <span className="big-gua" aria-hidden="true">
              ䷀
            </span>
            <h2>
              由下而上，
              <br />
              六爻成一卦。
            </h2>
            <p>
              第一次是初爻，第六次是上爻。老陰與老陽為動爻，陰陽相易，形成變卦。
            </p>
            <dl className="detail-list">
              <dt>6 · 老陰</dt>
              <dd>陰爻 → 陽爻</dd>
              <dt>7 · 少陽</dt>
              <dd>陽爻，不變</dd>
              <dt>8 · 少陰</dt>
              <dd>陰爻，不變</dd>
              <dt>9 · 老陽</dt>
              <dd>陽爻 → 陰爻</dd>
            </dl>
          </aside>
        </div>
      ) : (
        <>
          <section className="question-result">
            <span className="eyebrow">你所問的事</span>
            <h2>{question}</h2>
            <button className="button" onClick={reset}>
              重新卜卦
            </button>
          </section>
          <IChingView chart={chart} />
          <ChartActions chart={chart} question={question} />
        </>
      )}
    </>
  );
}
