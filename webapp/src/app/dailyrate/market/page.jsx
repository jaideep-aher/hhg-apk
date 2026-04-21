// app/dailyrate/market/page.tsx
"use client";

import { Suspense } from "react";
import DailyMarketRates from "@/components/DailyMarketRates"; // Adjust the import path as needed
import LoadingSkeleton from "@/components/loading-skeleton";

export default function MarketRatePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DailyMarketRates />
    </Suspense>
  );
}
