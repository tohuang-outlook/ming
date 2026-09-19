import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="notice error">
      <AlertCircle size={18} />
      {message}
    </div>
  ) : null;
}
export function NeedsProfile() {
  return (
    <section className="panel empty">
      <span className="empty-symbol">生</span>
      <h2>從你的出生資料開始</h2>
      <p>只需輸入一次，八字與紫微斗數即可共用。</p>
      <Link className="button primary" href="/profile">
        建立出生資料 <ArrowUpRight size={18} />
      </Link>
      <p className="small muted">出生資料目前儲存在你的裝置中。</p>
    </section>
  );
}
export function AccuracyNote() {
  return (
    <p className="notice">
      已通過上游回歸測試 · 待獨立命盤驗證（Needs
      verification）。真太陽時與喜用神未實作。
    </p>
  );
}
