"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { PageTitle, ErrorNotice } from "@/components/ui";
import { profileLabel } from "@/lib/storage";
import { calculateRelationship, relationshipPrompts } from "@/lib/relationship";
const QUESTIONS: Record<string, string[]> = {
  "伴侶": ["我們各自需要多少陪伴與獨處時間？", "金錢、家務與重要決定如何分工？", "有分歧時，怎麼暫停並回到對話？"],
  "朋友": ["彼此期待多久聯繫一次？", "哪些幫忙可以答應，哪些需要說不？", "如何表達關心而不替對方作決定？"],
  "家人": ["哪些事情需要尊重各自的選擇？", "如何安排照顧責任與休息？", "哪些舊有期待值得重新討論？"],
  "合作": ["誰負責決策、執行與核對成果？", "利益、時程與退出方式是否說清楚？", "意見不同時採用什麼決策程序？"],
};
export default function RelationshipPage() {
  const { store, error: storageError } = useStore();
  const [selection, setSelection] = useState<{ a: string; b: string } | null>(null);
  const [kind, setKind] = useState("伴侶");
  const aId = selection?.a ?? store.activeProfileId ?? "";
  const bId = selection?.b ?? store.profiles.find(p => p.id !== aId)?.id ?? "";
  const a = store.profiles.find(p => p.id === aId);
  const b = store.profiles.find(p => p.id === bId);
  const outcome = useMemo(() => {
    if (!a || !b) return { error: "請選擇兩位已保存的人物。" };
    try { return { result: calculateRelationship(a, b) }; }
    catch (e) { return { error: e instanceof Error ? e.message : "合盤計算失敗，請確認出生資料。" }; }
  }, [a, b]);
  const result = outcome.result;
  const prompt = result ? relationshipPrompts(result.dayPalace) : null;
  return <>
    <PageTitle eyebrow="TWO PEOPLE, ONE CONVERSATION" title="雙人關係合盤" description="從兩人的八字結構，開啟一段具體的相處對話。" />
    <ErrorNotice message={storageError} />
    {store.profiles.length < 2 ? <section className="panel empty"><h2>先建立兩位人物</h2><p>目前有 {store.profiles.length} 位人物。合盤需要兩份完整出生資料。</p><Link className="button primary" href="/profile">前往人物資料庫</Link></section> : <>
      <section className="panel form-panel">
        <div className="form-grid">
          <label>甲方<select aria-label="合盤甲方" value={aId} onChange={e => setSelection({ a: e.target.value, b: bId })}><option value="">選擇人物</option>{store.profiles.map(p => <option key={p.id} value={p.id}>{profileLabel(p)}</option>)}</select></label>
          <label>乙方<select aria-label="合盤乙方" value={bId} onChange={e => setSelection({ a: aId, b: e.target.value })}><option value="">選擇人物</option>{store.profiles.map(p => <option key={p.id} value={p.id}>{profileLabel(p)}</option>)}</select></label>
        </div>
        <label>關係情境<select value={kind} onChange={e => setKind(e.target.value)}>{Object.keys(QUESTIONS).map(k => <option key={k}>{k}</option>)}</select></label>
        <div className="actions"><button className="button" onClick={() => setSelection({ a: bId, b: aId })}>交換甲乙方</button><Link className="button" href="/profile">管理人物</Link></div>
        <p className="small muted">選擇人物後自動計算；情境只調整對話題目，不改變排盤。全程在本機運算，不使用 API 額度。</p>
      </section>
      <ErrorNotice message={outcome.error ?? ""} />
      {result && a && b && prompt && <div data-testid="relationship-result">
        <section className="panel"><h2>{a.name || "甲方"} × {b.name || "乙方"}</h2><p className="notice">這是八字結構比較，不是前世因果證明，也不提供緣分分數或婚姻成敗判定。合、沖只描述固定符號配對，不直接等於吉凶。</p>
          <div className="two-col equal">{[{ p: a, chart: result.a, role: "甲方" }, { p: b, chart: result.b, role: "乙方" }].map(({ p, chart, role }) => <div key={role}><h3>{role} · {p.name || "未命名人物"}</h3><p>{chart.pillars.map(pillar => `${pillar.label} ${pillar.ganZhi}`).join(" · ")}</p><p className="small muted">排盤時間 {chart.meta.calculationTime}（UTC+8）</p></div>)}</div>
        </section>
        <div className="two-col equal">
          <section className="panel"><h2>日主互動</h2><p className="gold">甲方 {result.a.dayMaster}（{result.dayMasters.aElement}） × 乙方 {result.b.dayMaster}（{result.dayMasters.bElement}）</p><dl className="detail-list"><dt>五行方向</dt><dd data-testid="day-master-direction">{result.dayMasters.interaction}</dd><dt>天干配對</dt><dd>{result.dayMasters.stem}</dd><dt>甲方看乙方的十神</dt><dd>{result.dayMasters.bToA}</dd><dt>乙方看甲方的十神</dt><dd>{result.dayMasters.aToB}</dd></dl><p className="small muted">十神是以各自日主為中心的命理分類，不表示真實身分、性別角色或誰應服從誰。相生不一定有利，相剋也不等於傷害。</p></section>
          <section className="panel"><h2>日支比較（傳統夫妻宮）</h2><p className="gold">{result.a.pillars[2].branch} × {result.b.pillars[2].branch}：{result.dayPalace}</p><h3>{prompt.title}</h3><p>{prompt.text}</p><p className="small muted">這是兩個日支的對照；用於朋友、家人或合作時，不將「夫妻宮」當作實際婚姻關係。</p></section>
        </div>
        <section className="panel"><h2>五行表層分布</h2><p className="small muted">每人八個表層字，各自總數為 8；不代表旺衰、喜用神或必須由對方補足。</p><div className="table-scroll"><table className="comparison-table"><thead><tr><th>五行</th><th>甲方</th><th>乙方</th></tr></thead><tbody>{result.elements.map(e => <tr key={e.element}><th>{e.element}</th><td>{e.a}</td><td>{e.b}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><h2>四柱交叉關係</h2><p>16 組位置配對中：天干五合 {result.counts.stemCombinations} 組、地支六合 {result.counts.branchCombinations} 組、六沖 {result.counts.clashes} 組。</p><p className="small muted">相同干支出現在不同柱位會分別列出；數量是位置對照，不是加減分。此版只標示五合、六合、六沖、同干與同支，未列入三合、三會、刑、害、破及合化條件。</p>
          <div className="table-scroll"><table className="comparison-table" aria-label="四柱交叉關係明細"><thead><tr><th>甲方柱位</th><th>乙方柱位</th><th>天干關係</th><th>地支關係</th></tr></thead><tbody>{result.matrix.map(row => <tr key={row.aKey + row.bKey}><td>{row.aLabel} {row.aPillar}</td><td>{row.bLabel} {row.bPillar}</td><td>{row.stem}</td><td>{row.branch}</td></tr>)}</tbody></table></div>
        </section>
        <section className="panel"><h2>{kind}相處討論</h2><p className="small muted">以下為共同討論的題目，並非從命盤推定任何人的性格或行為。</p><ol>{QUESTIONS[kind].map(q => <li key={q}>{q}</li>)}</ol></section>
        <section className="panel"><details><summary>計算依據與限制</summary><p>沿用八字引擎 lunar-typescript 1.8.6：UTC+8 標準時、立春換年、節令換月、00:00 換日，不校正真太陽時。傳統固定配對表參考《三命通會》卷二；配對本身不包含合化與旺衰判定。</p><p>本版為八字合盤，不含紫微合盤。出生時間及流派會影響結果；關係品質仍取決於實際互動、尊重與選擇。此結果不自動寫入個人命盤歷史。</p></details></section>
      </div>}
    </>}
  </>;
}
