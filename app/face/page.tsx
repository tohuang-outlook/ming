"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScanFace, ShieldCheck, Upload, Trash2 } from "lucide-react";
import { PageTitle, ErrorNotice } from "@/components/ui";
import { FACE_CULTURE, FaceAnalysisSchema, faceMeasurements, type FaceAnalysis } from "@/lib/face/schema";

type Result = { analysis: FaceAnalysis; photo: string };
const colors: Record<string, string> = { contour: "#e7c784", leftEye: "#8bdcc1", rightEye: "#8bdcc1", leftEyebrow: "#9cc8f5", rightEyebrow: "#9cc8f5", nose: "#ebaa8d", noseCrest: "#ebaa8d", lips: "#e6a8c7" };
export default function FacePage() {
  const desktop = useSyncExternalStore(() => () => {}, () => !!window.mingliDesktop, () => false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [overlay, setOverlay] = useState(true);
  const [includePhoto, setIncludePhoto] = useState(false);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { generation.current++; }, []);
  async function analyze(file?: File) {
    if (!file || !window.mingliDesktop) return;
    const current = ++generation.current;
    setResult(null); setIncludePhoto(false); setError(""); setMessage("");
    if (!/\.(jpe?g|png)$/i.test(file.name) || file.size > 15_000_000 || file.size === 0) {
      setError("請選擇 15 MB 以下的 JPG 或 PNG 照片。"); return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const response = await window.mingliDesktop.analyzeFace(bytes);
      if (current !== generation.current) return;
      if (response.error) throw new Error(response.error);
      if (!response.photo) throw new Error("未取得照片預覽，請重試。");
      setResult({ analysis: FaceAnalysisSchema.parse(response.analysis), photo: response.photo });
      setMessage("已在本機完成標示。照片尚未保存，也沒有上傳。");
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : "照片分析未完成，請重試。");
    } finally { if (current === generation.current) setBusy(false); }
  }
  function clear() {
    generation.current++; setResult(null); setIncludePhoto(false); setError(""); setBusy(false);
    setMessage("已從本頁移除照片與分析結果。你自行匯出的檔案需另行刪除。");
    if (input.current) input.current.value = "";
  }
  return <>
    <PageTitle eyebrow="FACE & TRADITION" title="面相文化觀察" description="從一張照片，認識可見的五官與傳統術語。" />
    <div className="notice face-privacy"><ShieldCheck size={22} /><span>照片僅在此裝置 分析，不上傳 DeepSeek。未按儲存就不會加入紀錄；離開本頁或結束 App 後，不再保留本頁照片。</span></div>
    <section className="panel face-intake">
      <div><ScanFace size={32} /><h2>選擇一張正面照片</h2><p className="muted">一人入鏡、正面平視、光線均勻，讓眉眼、鼻與下巴保持清楚。避免口罩、遮擋與過度修圖。</p><p className="small muted">JPG／PNG · 最多 15 MB、3200 萬像素 · 不辨識身分、不評分美醜。</p></div>
      <div>
        <label htmlFor="face-photo" className="small">選擇你有權使用的照片</label>
        <input ref={input} id="face-photo" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={!desktop || busy || saving} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void analyze(file); }} />
        {!desktop && <p className="notice">請在 Mac 或 iPhone App 使用本機照片分析。此頁不會將照片送往網站伺服器。</p>}
        {busy && <p role="status" className="notice">正在本機辨識五官，通常只需幾秒…</p>}
      </div>
    </section>
    <ErrorNotice message={error} />
    {message && <p role="status" className="notice">{message}</p>}
    {result && <div className="face-results">
      <section className="panel face-photo-panel">
        <div className="face-toolbar"><h2>可見特徵標示</h2><label><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)} /> 顯示標示</label></div>
        <svg className="face-preview" viewBox={`0 0 ${result.analysis.width} ${result.analysis.height}`} role="img" aria-label="匯入照片及本機偵測的眉眼、鼻、嘴與臉部輪廓">
          <image href={result.photo} width={result.analysis.width} height={result.analysis.height} />
          {overlay && Object.entries(result.analysis.face.points).map(([name, points]) => <g key={name} stroke={colors[name]} fill="none">
            <polyline points={points.map(p => `${p.x * result.analysis.width},${p.y * result.analysis.height}`).join(" ")} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            {points.map((p, i) => <circle key={i} cx={p.x * result.analysis.width} cy={p.y * result.analysis.height} r={Math.max(result.analysis.width / 500, 1.4)} fill={colors[name]} stroke="none" />)}
          </g>)}
        </svg>
        <p className="small face-legend"><span style={{ color: colors.contour }}>● 輪廓</span><span style={{ color: colors.leftEyebrow }}>● 眉</span><span style={{ color: colors.leftEye }}>● 眼</span><span style={{ color: colors.nose }}>● 鼻</span><span style={{ color: colors.lips }}>● 嘴</span></p>
        <p className="small muted">標示可能有誤，請先對照照片。額頭髮際與耳朵不自動推測。</p>
      </section>
      <section className="panel face-observations"><span className="eyebrow">可觀察的幾何量</span><h2>這張照片上的比例</h2>
        <p className="small muted">這些數字不代表性格、能力或吉凶，也不是醫療、美容或生物辨識評估。</p>
        <dl>{faceMeasurements(result.analysis).map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><p className="small muted">{item.note}</p></div>)}</dl>
        <label className="face-save-option"><input type="checkbox" checked={includePhoto} onChange={e => setIncludePhoto(e.target.checked)} disabled={saving} /> 儲存時附上照片（預設不勾選）</label>
        <p className="small muted">只在你指定的位置寫入 JSON 檔。附圖會使用縮小且已移除原始中繼資料的預覽；檔案含臉部資料，請妥善保管。</p>
        <div className="actions"><button className="button primary" disabled={saving} onClick={async () => {
          setSaving(true); setError("");
          try { const response = await window.mingliDesktop!.exportFace({ analysis: result.analysis, ...(includePhoto ? { photo: result.photo } : {}) }); if (response.error) throw new Error(response.error); if (!response.canceled) setMessage(includePhoto ? "觀察紀錄與照片已儲存至你選擇的位置。" : "觀察紀錄已儲存，檔案不含照片。"); }
          catch { setError("儲存未完成，請檢查目標位置或重試。"); } finally { setSaving(false); }
        }}><Upload size={16} />{saving ? "儲存中…" : "儲存觀察紀錄"}</button><button className="button" disabled={saving} onClick={clear}><Trash2 size={16} />移除本頁照片</button></div>
      </section>
    </div>}
    <section className="face-culture"><span className="eyebrow">文化閱讀 · 固定說明，非個人預測</span><h2>面相術語，如何理解？</h2><div className="face-culture-grid">{FACE_CULTURE.map(item => <article className="panel" key={item.title}><h3>{item.title}</h3><p className="muted">{item.text}</p></article>)}</div></section>
  </>;
}
