"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Layers3,
  Orbit,
  CalendarDays,
  Sparkles,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/components/store";
import { ErrorNotice } from "@/components/ui";
const entrances = [
  {
    href: "/iching",
    num: "01",
    title: "易經卜卦",
    sub: "一念起，一卦生",
    desc: "三枚銅錢，六次投擲。從本卦與變卦中，換個角度看眼前的問題。",
    icon: Sparkles,
    symbol: "䷊",
    class: "iching",
  },
  {
    href: "/bazi",
    num: "02",
    title: "八字命理",
    sub: "四柱之間，讀懂自己",
    desc: "以出生年月日時排四柱，探索十神、五行結構與人生大運。",
    icon: Layers3,
    symbol: "八",
    class: "bazi",
  },
  {
    href: "/ziwei",
    num: "03",
    title: "紫微斗數",
    sub: "十二宮，照見人生面向",
    desc: "查看星曜落宮、四化與大限，在完整命盤中理解彼此關聯。",
    icon: Orbit,
    symbol: "紫",
    class: "ziwei",
  },
  {
    href: "/fortune",
    num: "04",
    title: "流年運勢",
    sub: "在時間裡，找到自己的節奏",
    desc: "選擇年份，對照本命與流年。讓每一次回望，都成為新的思考。",
    icon: CalendarDays,
    symbol: "年",
    class: "fortune",
  },
];
export default function Home() {
  const { store, error } = useStore();
  return (
    <>
      <div className="home-intro">
        <div>
          <p className="eyebrow">知命 · 明心 · 篤行</p>
          <h1>
            觀天地之道，
            <br />
            <span>見自己的路。</span>
          </h1>
          <p className="muted">融合傳統命理智慧與現代 AI 解讀</p>
        </div>
        <div className="intro-mark" aria-hidden="true">
          <span>☯</span>
          <small>天 · 地 · 人</small>
        </div>
      </div>
      <ErrorNotice message={error} />
      <section className="profile-banner">
        <div className="round-icon">
          <UserSymbol />
        </div>
        <div>
          <h2>
            {store.profile
              ? `${store.profile.name || "你的"}命理旅程`
              : "你的命理旅程，從此開始"}
          </h2>
          <p>
            {store.profile
              ? "出生資料已就緒。八字、紫微與流年共用同一份資料。"
              : "建立一份出生資料，開啟專屬的八字與紫微命盤。"}
          </p>
        </div>
        <Link
          className="button primary"
          href={store.profile ? "/dashboard" : "/profile"}
        >
          {store.profile ? "查看我的命盤" : "建立出生資料"}
          <Plus size={17} />
        </Link>
      </section>
      <div className="section-heading">
        <h2>探索傳統命理</h2>
        <span>四種視角，一份更深的理解</span>
      </div>
      <div className="entrance-grid">
        {entrances.map((e) => (
          <Link className={`entrance ${e.class}`} href={e.href} key={e.href}>
            <div className="card-top">
              <e.icon size={21} />
              <span>{e.num}</span>
            </div>
            <div className="entrance-copy">
              <span className="card-sub">{e.sub}</span>
              <h2>{e.title}</h2>
              <p>{e.desc}</p>
            </div>
            <div className="card-bottom">
              <span>開始探索</span>
              <ArrowUpRight size={21} />
            </div>
            <span className="card-symbol" aria-hidden="true">
              {e.symbol}
            </span>
          </Link>
        ))}
      </div>
      <section className="method-strip">
        <div>
          <span>01</span>
          <h3>演算法精準排盤</h3>
          <p>固定規則、可重現的計算結果</p>
        </div>
        <div>
          <span>02</span>
          <h3>AI 輔助理解</h3>
          <p>解釋命盤，不重新計算命盤</p>
        </div>
        <div>
          <span>03</span>
          <h3>你的資料，由你掌握</h3>
          <p>預設保存在目前裝置</p>
        </div>
      </section>
    </>
  );
}
function UserSymbol() {
  return <ShieldCheck size={25} />;
}
