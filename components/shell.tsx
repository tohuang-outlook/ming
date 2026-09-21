"use client";
import { ProfileSwitcher } from "./profile-switcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Sparkles,
  Layers3,
  Orbit,
  CalendarDays,
  UserRound,
  History,
  Settings,
  ShieldCheck,
  ScanFace,
  Users,
} from "lucide-react";
import { DISCLAIMER } from "@/types";
const links = [
  ["/", "首頁", Home],
  ["/iching", "易經卜卦", Sparkles],
  ["/bazi", "八字命理", Layers3],
  ["/ziwei", "紫微斗數", Orbit],
  ["/fortune", "流年運勢", CalendarDays],
  ["/face", "面相觀察", ScanFace],
  ["/dashboard", "我的命盤", UserRound],
  ["/history", "歷史紀錄", History],
  ["/settings", "設定", Settings],
  ["/relationship", "雙人合盤", Users],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        跳至主要內容
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="seal">命</span>
          <span>
            中華命理 <em>AI</em>
            <small>ZHONGHUA MINGLI</small>
          </span>
        </Link>
        <p className="nav-label">探索命理</p>
        <nav aria-label="主要導覽">
          {links.map(([url, label, Icon]) => (
            <Link
              key={url}
              href={url}
              aria-current={path === url ? "page" : undefined}
              className={`${path === url ? "active" : ""} ${url === "/dashboard" ? "nav-break" : ""}`}
            >
              <Icon size={19} />
              {label}
              {path === url && <span className="nav-mark" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={20} />
          <p>
            隱私，留在你手中<small>出生資料儲存在你的裝置中</small>
          </p>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <Link href="/" className="mobile-brand">
            中華命理 <em>AI</em>
          </Link>
          <span className="desktop-only">
            傳統智慧 <span className="divider">/</span> 當代探索
          </span>
          <div className="top-actions">
            <ProfileSwitcher />
            <Link href="/settings" className="settings-link" aria-label="設定">
              <Settings size={18} />
            </Link>
            <Link href="/profile" className="profile-link">
              <UserRound size={17} /> 出生資料 <span>↗</span>
            </Link>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          {DISCLAIMER}
          <div>
            中華命理 AI <span>·</span> 程式排盤，AI 解讀
          </div>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="手機導覽">
        {[links[0], links[1], links[2], links[3], links[6]].map(
          ([url, label, Icon]) => (
            <Link
              href={url}
              key={url}
              aria-current={path === url ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
