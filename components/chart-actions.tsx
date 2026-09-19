"use client";
import { useState } from "react";
import type { Chart } from "@/types/charts";
import { DISCLAIMER } from "@/types";
import {
  prepareInterpretation,
  InterpretationSchema,
  type AnnualBaziSchema,
} from "@/lib/interpretation/schema";
import { z } from "zod";
import { useStore } from "./store";
import { putHistory } from "@/lib/history";
import { ErrorNotice } from "./ui";
import type { HistoryRecord } from "@/types/history";
export function ChartActions({
  chart,
  question = "",
  annualBazi,
  existing,
}: {
  chart: Chart;
  question?: string;
  annualBazi?: z.infer<typeof AnnualBaziSchema>;
  existing?: HistoryRecord;
}) {
  const { store } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const key = JSON.stringify([chart, question, annualBazi]);
  const [result, setResult] = useState<{
    key: string;
    data: z.infer<typeof InterpretationSchema>;
  } | null>(null);
  const [saved, setSaved] = useState<{
    key: string;
    id: string;
    createdAt: string;
  } | null>(null);
  const interpretation =
    result?.key === key ? result.data : (existing?.interpretation ?? null);
  async function interpret() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          prepareInterpretation(chart, question, annualBazi),
        ),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "AI 解讀失敗。");
      const data = InterpretationSchema.parse(body.interpretation);
      setResult({ key, data });
      setMessage("解讀已完成，請按保存紀錄留存。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 連線失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }
  function save() {
    try {
      const id =
        existing?.id ?? (saved?.key === key ? saved.id : crypto.randomUUID());
      const createdAt =
        existing?.createdAt ??
        (saved?.key === key ? saved.createdAt : new Date().toISOString());
      putHistory({
        id,
        version: 1,
        type: chart.system,
        createdAt,
        question,
        birthProfileId:
          existing?.birthProfileId ??
          (chart.system === "iching" ? null : (store.profile?.id ?? null)),
        chart,
        annualBazi,
        interpretation,
      });
      setSaved({ key, id, createdAt });
      setMessage("已保存至這部裝置的歷史紀錄。");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失敗。");
    }
  }
  return (
    <section className="panel interpretation">
      <span className="eyebrow">從命盤，到理解</span>
      <h2>AI 詳細解讀</h2>
      <p className="small muted">
        只傳送解讀所需的命盤結構與你的問題至
        DeepSeek，不傳送稱呼、出生地或原始出生日期。請勿在問題中填入敏感個資。AI
        解讀可能有誤，請對照原始命盤。
      </p>
      <div className="actions">
        <button className="button primary" disabled={busy} onClick={interpret}>
          {busy ? "正在解讀命盤…" : "查看詳細解讀"}
        </button>
        <button className="button" onClick={save}>
          保存紀錄
        </button>
      </div>
      <ErrorNotice message={error} />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {interpretation && (
        <>
          <h3>命盤概要</h3>
          <p>{interpretation.summary}</p>
          {interpretation.sections.map((s, i) => (
            <article key={i}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <small className="muted">依據：{s.factIds.join("、")}</small>
            </article>
          ))}
          <ul>
            {interpretation.limitations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}
      <p className="small muted">{DISCLAIMER}</p>
    </section>
  );
}
