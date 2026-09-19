"use client";
import { useState } from "react";
import { useBirthCharts } from "@/components/use-chart";
import {
  PageTitle,
  NeedsProfile,
  ErrorNotice,
  AccuracyNote,
} from "@/components/ui";
import { ChartActions } from "@/components/chart-actions";
export default function FortunePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { profile, bazi, ziwei, annualBazi, error } = useBirthCharts(year);
  return (
    <>
      <PageTitle
        eyebrow="A YEAR IN PERSPECTIVE"
        title="流年運勢"
        description="流年是對照本命的另一個視角，不是確定的未來。"
        action={
          <label className="small">
            選擇年份
            <input
              className="year-picker"
              type="number"
              min={1901}
              max={2099}
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                if (Number.isInteger(y) && y >= 1901 && y <= 2099) setYear(y);
              }}
            />
          </label>
        }
      />
      {!profile ? (
        <NeedsProfile />
      ) : (
        <>
          <ErrorNotice message={error} />
          <AccuracyNote />
          {bazi && ziwei && annualBazi && ziwei.annual ? (
            <>
              <div className="annual-columns">
                <section className="panel">
                  <span className="eyebrow">八字流年</span>
                  <h2>
                    {year} · {annualBazi.ganZhi}年
                  </h2>
                  <p>
                    對日主 {bazi.dayMaster}：{annualBazi.tenGod}
                  </p>
                  <p className="small muted">{annualBazi.period}</p>
                  <dl className="detail-list">
                    {annualBazi.relations.map((r) => (
                      <div className="full-span" key={r.pillar}>
                        <strong>{r.pillar}</strong>
                        <p className="small muted">
                          {r.stem} · {r.branch}
                        </p>
                      </div>
                    ))}
                  </dl>
                  <p className="small muted">
                    {annualBazi.limitations.join(" ")}
                  </p>
                </section>
                <section className="panel">
                  <span className="eyebrow">紫微流年</span>
                  <h2>
                    {year} · {ziwei.annual.ganZhi}年
                  </h2>
                  <p>
                    流年命宮在本命{ziwei.palaces[ziwei.annual.soulIndex].name}
                  </p>
                  <p className="small muted">{ziwei.annual.period}</p>
                  <dl className="detail-list">
                    {["化祿", "化權", "化科", "化忌"].map((label, i) => (
                      <div className="full-span" key={label}>
                        <strong>{label}</strong>
                        <span className="gold">
                          　{ziwei.annual!.transformations[i]}
                        </span>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
              <section className="panel">
                <h2>流年十二宮 × 本命宮位</h2>
                <div className="relation-grid">
                  {ziwei.annual.palaces.map((p) => (
                    <div key={p.index}>
                      {p.name}
                      <small>
                        本命{p.natalPalace} · {p.branch}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
              <ChartActions
                chart={bazi}
                question={`請解讀 ${year} 流年。`}
                annualBazi={annualBazi}
              />
              <ChartActions
                chart={ziwei}
                question={`請解讀 ${year} 紫微流年，與本命、大限分開說明。`}
              />
            </>
          ) : (
            !error && <p role="status">正在計算 {year} 流年…</p>
          )}
        </>
      )}
    </>
  );
}
