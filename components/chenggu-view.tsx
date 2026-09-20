import { chengguVerse, CHENGGU_VERSE_EDITION } from "@/lib/chenggu/verses";
import { Fragment } from "react";
import { calculateChenggu, formatWeight } from "@/lib/chenggu";
export function ChengguView({ calculationTime }: { calculationTime: string }) {
  let result: ReturnType<typeof calculateChenggu>;
  try { result = calculateChenggu(calculationTime); }
  catch {
    return <section className="panel"><h2>袁天罡稱骨命重</h2><p role="status">這筆紀錄的排盤時間無法用於稱骨計算。原有命盤仍保留，請確認出生資料後重新排盤。</p></section>;
  }
  const verse = chengguVerse(result.totalQian);
  return <section className="panel" aria-labelledby="chenggu-title">
    <div className="section-heading"><h2 id="chenggu-title">袁天罡稱骨命重</h2><strong className="gold" data-testid="chenggu-total">{result.weight}</strong></div>
    <p className="small muted">農曆 {result.lunarYear} 年{result.leap ? "閏" : ""}{result.month} 月 {result.day} 日 · 四項相加，十錢為一兩。</p>
    <dl className="detail-list">{result.parts.map(part => <Fragment key={part.label}><dt>{part.label} · {part.basis}</dt><dd>{formatWeight(part.qian)}</dd></Fragment>)}</dl>
    <p className="small">{result.parts.map(part => formatWeight(part.qian)).join(" ＋ ")} ＝ {result.weight}</p>
    <div className="chenggu-verse" aria-label="命重評語">
      <h3>{result.weight}・稱骨歌</h3>
      <p className="small muted">{CHENGGU_VERSE_EDITION}</p>
      {verse ? <blockquote>{verse.map((line, index) => <p key={index}>{line}{index % 2 === 0 ? "，" : "。"}</p>)}</blockquote> : <p>此重量尚無收錄歌訣。</p>}
      <p className="small muted">歌訣為傳統民俗評語，保留舊時措辭；其中的壽命、貧富與家庭描述不是對你的預測。不同流傳版本用字可能不同，本版不另分男女歌。</p>
    </div>
    <details><summary>計算規則與來源</summary>
      <p className="small muted">沿用命盤的 UTC+8 標準時間，不校正真太陽時。農曆正月初一換年；23:00 起按次日農曆年月日計。閏月初一至十五按本月，十六日起按下月；日數保持不變。重量表男女通用。</p>
      {result.shifted && <p className="small">此出生時間在 23:00 後，稱骨日期已按次日計算；四柱命盤仍依其自身的換日規則。</p>}
      <p className="small muted">採傳統流傳重量表，參考「順時命理：稱骨歌幾兩幾錢怎麼算」與「Deep Oracle：八字重量計算」。不同版本與換日規則可能得出不同結果。</p>
    </details>
    <p className="small muted">相傳為袁天罡稱骨法，屬民俗文化參考。命重不是體重，也不代表個人價值、健康或命運好壞；此處提供查表計算，不以 AI 改寫結果。</p>
  </section>;
}
