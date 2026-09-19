"use client";
import {
  PageTitle,
  NeedsProfile,
  ErrorNotice,
  AccuracyNote,
} from "@/components/ui";
import { useBirthCharts } from "@/components/use-chart";
import { ZiWeiView } from "@/components/chart-views";
import { ChartActions } from "@/components/chart-actions";
export default function ZiWeiPage() {
  const { profile, ziwei, error } = useBirthCharts();
  return (
    <>
      <PageTitle
        eyebrow="THE PURPLE STAR"
        title="紫微斗數"
        description="十二宮中的星曜與四化，構成你的人生座標。"
      />
      {!profile ? (
        <NeedsProfile />
      ) : (
        <>
          <ErrorNotice message={error} />
          <AccuracyNote />
          {ziwei ? (
            <>
              <ZiWeiView chart={ziwei} name={profile.name} />
              <ChartActions chart={ziwei} />
            </>
          ) : (
            !error && <p role="status">正在安置星曜與十二宮…</p>
          )}
        </>
      )}
    </>
  );
}
