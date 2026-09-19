"use client";
import { useEffect, useState } from "react";
import { useStore } from "./store";
import type { baziYear, BaziChart } from "@/lib/bazi";
import type { ZiWeiChart } from "@/lib/ziwei";
export function useBirthCharts(year?: number) {
  const { store } = useStore();
  const [result, setResult] = useState<{
    key: string;
    bazi: BaziChart;
    ziwei: ZiWeiChart;
    annualBazi: ReturnType<typeof baziYear> | null;
  } | null>(null);
  const [error, setError] = useState("");
  const p = store.profile;
  const cfg = store.settings.ziwei;
  const key = JSON.stringify([p, cfg, year]);
  useEffect(() => {
    let cancelled = false;
    if (!p) return;
    Promise.all([import("@/lib/bazi"), import("@/lib/ziwei")])
      .then(([b, z]) => {
        const bazi = b.calculateBazi(p);
        const data = {
          key,
          bazi,
          ziwei: z.calculateZiWei(p, cfg, year),
          annualBazi: year ? b.baziYear(bazi, year) : null,
        };
        if (!cancelled) {
          setResult(data);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "命盤計算失敗，請檢查出生資料。",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [p, cfg, year, key]);
  return {
    profile: p,
    annualBazi: result?.key === key ? result.annualBazi : null,
    bazi: result?.key === key ? result.bazi : null,
    ziwei: result?.key === key ? result.ziwei : null,
    error,
  };
}
