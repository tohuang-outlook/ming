"use client";
import { useState } from "react";
import type { BaziChart } from "@/lib/bazi";
import type { ZiWeiChart } from "@/lib/ziwei";
import type { IChingChart } from "@/lib/iching";
import { useStore } from "./store";
import { ChartActions } from "./chart-actions";
export function BaziView({ chart }: { chart: BaziChart }) {
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>四柱命盤</h2>
          <span>日主 · {chart.dayMaster}</span>
        </div>
        <p className="small muted">
          {chart.lunarDate} · {chart.meta.calculationTime}（UTC+8）
        </p>
        <div className="pillars">
          {[...chart.pillars].reverse().map((p) => (
            <div
              className={`pillar ${p.key === "day" ? "day" : ""}`}
              key={p.key}
            >
              <h3>{p.label}</h3>
              <span className="small gold">{p.tenGod}</span>
              <div className="stem">{p.stem}</div>
              <div className="stem branch">{p.branch}</div>
              <span className="tag">
                {p.yinYang} · {p.elements}
              </span>
              <dl>
                <dt>藏干</dt>
                <dd>{p.hiddenStems.join(" ")}</dd>
                <dt>藏干十神</dt>
                <dd>{p.hiddenTenGods.join("・")}</dd>
                <dt>納音</dt>
                <dd>{p.naYin}</dd>
                <dt>十二長生</dt>
                <dd>{p.stage}</dd>
              </dl>
            </div>
          ))}
        </div>
      </section>
      <div className="two-col equal">
        <section className="panel">
          <h2>五行分布</h2>
          <p className="small muted">{chart.elementMethod}</p>
          <div className="elements">
            {Object.entries(chart.elements).map(([e, count], i) => (
              <div key={e} className="element">
                <span>{e}</span>
                <div>
                  <i
                    style={{
                      width: `${(count / 8) * 100}%`,
                      background: [
                        "#8ca98b",
                        "#ce8669",
                        "#b8a16e",
                        "#d6d2bd",
                        "#88a6bb",
                      ][i],
                    }}
                  />
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
          <p className="small muted">
            未提供喜用神判定。缺某一行不代表必須補足。
          </p>
        </section>
        <section className="panel">
          <h2>排盤依據</h2>
          <dl className="detail-list">
            <dt>年界</dt>
            <dd>{chart.rules.yearBoundary}</dd>
            <dt>月界</dt>
            <dd>{chart.rules.monthBoundary}</dd>
            <dt>換日</dt>
            <dd>{chart.rules.dayBoundary}</dd>
            <dt>排盤時間</dt>
            <dd>UTC+8 標準時</dd>
            <dt>真太陽時</dt>
            <dd>未實作</dd>
          </dl>
        </section>
      </div>
      <section className="panel">
        <h2>大運時間軸</h2>
        <p className="muted small">
          {chart.luck.forward ? "順行" : "逆行"} · 出生後{" "}
          {chart.luck.start.years} 年 {chart.luck.start.months} 月{" "}
          {chart.luck.start.days} 日起運 · {chart.luck.start.date}
        </p>
        <div className="timeline">
          {chart.luck.cycles.map((c) => (
            <article key={c.index}>
              <small>
                {c.startAge}–{c.endAge} 歲
              </small>
              <strong>{c.ganZhi}</strong>
              <span>
                {c.startYear}–{c.endYear}
              </span>
            </article>
          ))}
        </div>
        <p className="small muted">
          歲數採套件的名義年齡區間；實際起運日以上方日期為準。
        </p>
      </section>
    </>
  );
}
const positions: Record<string, [number, number]> = {
  巳: [1, 1],
  午: [1, 2],
  未: [1, 3],
  申: [1, 4],
  辰: [2, 1],
  酉: [2, 4],
  卯: [3, 1],
  戌: [3, 4],
  寅: [4, 1],
  丑: [4, 2],
  子: [4, 3],
  亥: [4, 4],
};
export function ZiWeiView({
  chart,
  name,
}: {
  chart: ZiWeiChart;
  name?: string;
}) {
  const { store } = useStore();
  const [mode, setMode] = useState<"grid" | "list" | null>(null);
  const view = mode ?? store.settings.chartView;
  const [selected, setSelected] = useState<number | null>(null);
  const cycle = chart.cycles.find((c) => c.index === selected);
  return (
    <>
      <div className="section-heading">
        <h2>紫微本命盤</h2>
        <div className="segmented">
          <button
            aria-pressed={view === "grid"}
            onClick={() => setMode("grid")}
          >
            傳統命盤
          </button>
          <button
            aria-pressed={view === "list"}
            onClick={() => setMode("list")}
          >
            列表模式
          </button>
        </div>
      </div>
      <div className={view === "grid" ? "ziwei-scroll" : "ziwei-list"}>
        <div className={view === "grid" ? "ziwei-grid" : "palace-list"}>
          <div className="chart-center">
            <span className="eyebrow">紫微斗數 · 本命</span>
            <h2>{name || "我的命盤"}</h2>
            <strong>{chart.fiveElementsClass}</strong>
            <p>
              {chart.lunarDate}
              <br />
              {chart.meta.calculationTime}
              <br />
              {chart.gender === "male" ? "男" : "女"} · UTC+8
            </p>
            <div>
              命宮 {chart.soulPalace} <span className="divider">/</span> 身宮{" "}
              {chart.bodyPalace}
            </div>
          </div>
          {chart.palaces.map((p) => (
            <article
              className={`palace ${p.name === "命宮" ? "soul" : ""}`}
              key={p.index}
              style={
                view === "grid"
                  ? {
                      gridRow: positions[p.branch][0],
                      gridColumn: positions[p.branch][1],
                    }
                  : undefined
              }
            >
              <div className="palace-head">
                <h3>
                  {p.name === "僕役" ? "交友" : p.name}
                  {p.isBody && <small>身</small>}
                </h3>
                <span>
                  {p.stem}
                  {p.branch}
                </span>
              </div>
              <div className="stars">
                {p.stars
                  .filter((s) => s.category === "major")
                  .map((s) => (
                    <strong key={s.name}>
                      {s.name}
                      {s.transformation && <i>{s.transformation}</i>}
                    </strong>
                  ))}
              </div>
              <div className="minor-stars">
                {p.stars
                  .filter(
                    (s) =>
                      s.category !== "major" &&
                      ["benefic", "malefic", "lucun"].includes(s.category),
                  )
                  .map((s) => (
                    <span key={s.name}>
                      {s.name}
                      {s.transformation && <i>{s.transformation}</i>}
                    </span>
                  ))}
              </div>
              <small className="palace-age">
                {p.decadal.startAge}–{p.decadal.endAge} 歲 · {p.decadal.ganZhi}
              </small>
            </article>
          ))}
        </div>
      </div>
      <section className="panel">
        <h2>大限 · 人生的不同篇章</h2>
        <p className="small muted">
          點選大限查看十二宮定位與四化，歲數採虛歲。
        </p>
        <div className="timeline">
          {chart.cycles.map((c) => (
            <button
              key={c.index}
              onClick={() => setSelected(c.index)}
              aria-pressed={selected === c.index}
            >
              <small>
                {c.startAge}–{c.endAge} 歲
              </small>
              <strong>{c.ganZhi}</strong>
              <span>{c.palaceName}</span>
            </button>
          ))}
        </div>
        {cycle && (
          <div className="cycle-detail">
            <h3>
              {cycle.startAge}–{cycle.endAge} 歲 · 大限命宮在本命
              {cycle.palaceName}
            </h3>
            <p>
              化祿 {cycle.transformations[0]} · 化權 {cycle.transformations[1]}{" "}
              · 化科 {cycle.transformations[2]} · 化忌{" "}
              {cycle.transformations[3]}
            </p>
            <div className="relation-grid">
              {cycle.palaceNames.map((n, i) => (
                <div key={i}>
                  {n}
                  <small>
                    本命{chart.palaces[i].name} · {chart.palaces[i].branch}
                  </small>
                </div>
              ))}
            </div>
            <ChartActions
              chart={chart}
              question={`請只解讀 ${cycle.startAge}–${cycle.endAge} 歲大限，命宮在本命${cycle.palaceName}，索引 ${cycle.index}；請與本命及流年明確區分。`}
            />
          </div>
        )}
      </section>
    </>
  );
}
export function HexagramLines({
  bits,
  moving = [],
}: {
  bits: string;
  moving?: number[];
}) {
  return (
    <div
      className="hex-lines"
      role="img"
      aria-label={`由初爻至上爻：${[...bits].map((b) => (b === "1" ? "陽" : "陰")).join("、")}；動爻 ${moving.join("、") || "無"}`}
    >
      {[...bits]
        .map((bit, i) => ({ bit, pos: i + 1 }))
        .reverse()
        .map(({ bit, pos }) => (
          <div
            className={`hex-line ${moving.includes(pos) ? "moving" : ""}`}
            key={pos}
          >
            <span className="line-number">{pos}</span>
            <div className={bit === "1" ? "yang" : "yin"}>
              <i />
              <i />
            </div>
            <span className="line-marker">
              {moving.includes(pos) ? "動" : ""}
            </span>
          </div>
        ))}
    </div>
  );
}
export function IChingView({ chart }: { chart: IChingChart }) {
  return (
    <div className="two-col equal">
      <section className="panel hex-panel">
        <span className="eyebrow">本卦 · 當下的切面</span>
        <h2>
          第 {chart.original.number} 卦：{chart.original.name}
        </h2>
        <HexagramLines
          bits={chart.original.binary}
          moving={chart.movingLines}
        />
        <p>
          {chart.original.upper}上 · {chart.original.lower}下
        </p>
        <p className="muted">{chart.original.shortMeaning}</p>
        <small>
          動爻：
          {chart.movingLines
            .map((n) => chart.original.lineIdentifiers[n - 1])
            .join("、") || "無動爻"}
        </small>
      </section>
      <section className="panel hex-panel">
        <span className="eyebrow">變卦 · 變化的方向</span>
        <h2>
          第 {chart.changed.number} 卦：{chart.changed.name}
        </h2>
        <HexagramLines bits={chart.changed.binary} />
        <p>
          {chart.changed.upper}上 · {chart.changed.lower}下
        </p>
        <p className="muted">{chart.changed.shortMeaning}</p>
        <small>{chart.changed.judgmentReference}</small>
      </section>
    </div>
  );
}
