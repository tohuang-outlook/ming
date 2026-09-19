import { Suspense } from "react";
import { HistoryContent } from "@/components/history-content";
export default function HistoryPage() {
  return (
    <Suspense fallback={<p>正在讀取裝置紀錄…</p>}>
      <HistoryContent />
    </Suspense>
  );
}
