"use client";
import Link from "next/link";
import { PageTitle, NeedsProfile, ErrorNotice } from "@/components/ui";
import { useBirthCharts } from "@/components/use-chart";
import { useStore } from "@/components/store";
export default function Dashboard() {
  const { profile, bazi, ziwei, error } = useBirthCharts();
  const { store } = useStore();
  const recent = store.history.find((r) => r.type === "iching");
  return (
    <>
      <PageTitle
        eyebrow="YOUR PERSONAL ATLAS"
        title="我的命盤"
        description="保存你的座標，從不同角度認識自己。"
        action={
          <Link href="/profile" className="button">
            編輯出生資料
          </Link>
        }
      />
      {!profile ? (
        <NeedsProfile />
      ) : (
        <>
          <ErrorNotice message={error} />
          <section className="profile-banner">
            <div>
              <h2>{profile.name || "我的命理檔案"}</h2>
              <p>
                {profile.birthDate} · {profile.birthTime} ·{" "}
                {profile.calendarType === "Lunar" ? "農曆" : "國曆"} ·{" "}
                {profile.timezone}
              </p>
            </div>
            <span className="tag">裝置本機保存</span>
          </section>
          <div className="dashboard-cards">
            <Link className="panel" href="/bazi">
              <span className="eyebrow">八字命理</span>
              <h2>我的八字</h2>
              <strong>{bazi ? `${bazi.dayMaster}日主` : "計算中…"}</strong>
              <p className="muted small">
                {bazi?.pillars.map((p) => p.ganZhi).join(" · ")}
              </p>
              <span className="gold small">查看四柱與大運 ↗</span>
            </Link>
            <Link className="panel" href="/ziwei">
              <span className="eyebrow">紫微斗數</span>
              <h2>我的紫微斗數</h2>
              <strong>{ziwei?.fiveElementsClass ?? "計算中…"}</strong>
              <p className="muted small">
                {ziwei
                  ? `命宮 ${ziwei.soulPalace} · 身宮 ${ziwei.bodyPalace}`
                  : ""}
              </p>
              <span className="gold small">查看十二宮 ↗</span>
            </Link>
            <Link className="panel" href="/fortune">
              <span className="eyebrow">流年運勢</span>
              <h2>今年流年</h2>
              <strong>{new Date().getFullYear()}</strong>
              <p className="muted small">八字與紫微流年對照</p>
              <span className="gold small">探索這一年的節奏 ↗</span>
            </Link>
            <Link
              className="panel"
              href={
                recent
                  ? `/history?id=${encodeURIComponent(recent.id)}`
                  : "/iching"
              }
            >
              <span className="eyebrow">易經卜卦</span>
              <h2>最近易經卜卦</h2>
              <strong>
                {recent?.chart.system === "iching"
                  ? recent.chart.original.name
                  : "尚無紀錄"}
              </strong>
              <p className="muted small">
                {recent?.question || "從一個清楚的問題開始。"}
              </p>
              <span className="gold small">
                {recent ? "回看卦象" : "開始卜卦"} ↗
              </span>
            </Link>
          </div>
          <Link className="button" href="/relationship">雙人關係合盤 →</Link>
          <Link className="button" href="/history">
            查看全部歷史紀錄（{store.history.length}）→
          </Link>
        </>
      )}
    </>
  );
}
