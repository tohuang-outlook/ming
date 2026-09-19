"use client";
import {
  PageTitle,
  NeedsProfile,
  ErrorNotice,
  AccuracyNote,
} from "@/components/ui";
import { useBirthCharts } from "@/components/use-chart";
import { BaziView } from "@/components/chart-views";
import { ChartActions } from "@/components/chart-actions";
export default function BaziPage() {
  const { profile, bazi, error } = useBirthCharts();
  return (
    <>
      <PageTitle
        eyebrow="THE FOUR PILLARS"
        title="八字命理"
        description="以四柱為起點，理解五行與十神的結構。"
      />
      {!profile ? (
        <NeedsProfile />
      ) : (
        <>
          <ErrorNotice message={error} />
          <AccuracyNote />
          {bazi ? (
            <>
              <BaziView chart={bazi} />
              <ChartActions chart={bazi} />
            </>
          ) : (
            !error && <p role="status">正在計算四柱與起運時間…</p>
          )}
        </>
      )}
    </>
  );
}
