"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "./store";
import { PageTitle, ErrorNotice } from "./ui";
import { BaziView, ZiWeiView, IChingView } from "./chart-views";
import { ChartActions } from "./chart-actions";
import { deleteHistory, formatDate } from "@/lib/history";
import Link from "next/link";
export function HistoryContent() {
  const { store, error: storageError } = useStore();
  const params = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(params.get("id"));
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const current = store.history.find((r) => r.id === selected);
  const records = store.history.filter(
    (r) => (filter === "all" || r.type === filter) && (personFilter === "all" || (personFilter === "none" ? !r.birthProfileId : r.birthProfileId === personFilter)),
  );
  function owner(record: typeof store.history[number]) {
    if (!record.birthProfileId) return "未關聯人物";
    const person = store.profiles.find(p => p.id === record.birthProfileId);
    return record.birthProfileName || person?.name || (person ? "未命名人物" : "已刪除／舊版人物");
  }
  const people = [...new Set(store.history.map(r => r.birthProfileId).filter((id): id is string => !!id))];
  const labels = { bazi: "八字命理", ziwei: "紫微斗數", iching: "易經卜卦" };
  return (
    <>
      <PageTitle
        eyebrow="YOUR JOURNEY, REMEMBERED"
        title="歷史紀錄"
        description="回看當時的問題、命盤與思考。原始排盤與規則完整保留。"
      />
      <ErrorNotice message={error || storageError} />
      {current ? (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            ← 返回紀錄
          </button>
          <section className="panel">
            <h2>
              {labels[current.type]} ·{" "}
              {formatDate(current.createdAt, store.settings.dateFormat)}
            </h2>
            <p className="small muted">人物：{owner(current)}</p>
            <p>{current.question}</p>
            {current.chart.system === "iching" && (
              <p className="small muted">
                原始投擲（由下往上）：
                {current.chart.tosses.map((t) => t.join("+")).join(" / ")}
              </p>
            )}
            <details>
              <summary>查看保存的完整命盤 JSON</summary>
              <pre className="json-preview">
                {JSON.stringify(current.chart, null, 2)}
              </pre>
            </details>
          </section>
          {current.chart.system === "bazi" ? (
            <BaziView chart={current.chart} />
          ) : current.chart.system === "ziwei" ? (
            <ZiWeiView chart={current.chart} />
          ) : (
            <IChingView chart={current.chart} />
          )}
          <ChartActions
            key={current.id}
            chart={current.chart}
            question={current.question}
            annualBazi={current.annualBazi}
            existing={current}
          />
        </>
      ) : (
        <>
          <label>篩選人物<select value={personFilter} onChange={e => setPersonFilter(e.target.value)}><option value="all">全部人物</option><option value="none">未關聯人物（易經等）</option>{people.map(id => <option key={id} value={id}>{owner(store.history.find(r => r.birthProfileId === id)!)}</option>)}</select></label>
          <div className="segmented" aria-label="紀錄類型">
            {[
              ["all", "全部"],
              ["bazi", "八字"],
              ["ziwei", "紫微"],
              ["iching", "易經"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                aria-pressed={filter === v}
              >
                {label}
              </button>
            ))}
          </div>
          {records.length === 0 ? (
            <section className="panel empty">
              <h2>這裡將留下你的探索</h2>
              <p className="muted">
                完成命盤或卜卦後，按「保存紀錄」即可留存。
              </p>
              <Link href="/iching" className="button primary">
                開始易經卜卦
              </Link>
            </section>
          ) : (
            <div className="record-list">
              {records.map((r) => (
                <article className="panel record" key={r.id}>
                  <div>
                    <span className="eyebrow">{labels[r.type]}</span>
                    <p className="small muted">人物：{owner(r)}</p>
                    <h3>{r.question || `${labels[r.type]}命盤`}</h3>
                    <p>
                      {formatDate(r.createdAt, store.settings.dateFormat)} ·{" "}
                      {r.interpretation ? "含 AI 解讀" : "原始命盤"}
                    </p>
                  </div>
                  <div className="actions">
                    <button
                      className="button"
                      onClick={() => setSelected(r.id)}
                    >
                      查看
                    </button>
                    <button
                      className="button danger"
                      onClick={() => setConfirm(r.id)}
                    >
                      刪除
                    </button>
                  </div>
                  {confirm === r.id && (
                    <div role="alert">
                      <p>確定刪除這筆紀錄？</p>
                      <button
                        className="button danger"
                        onClick={() => {
                          try {
                            deleteHistory(r.id);
                            setConfirm(null);
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "刪除失敗。",
                            );
                          }
                        }}
                      >
                        確定刪除
                      </button>
                      <button
                        className="button"
                        onClick={() => setConfirm(null)}
                      >
                        取消
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
