import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty">
      <h1>找不到這個頁面</h1>
      <Link className="button primary" href="/">
        返回首頁
      </Link>
    </section>
  );
}
