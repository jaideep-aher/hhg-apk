"use client";

import { Suspense } from "react";
import BestMarketForCrop from "@/components/BestMarketForCrop";
import LoadingSkeleton from "@/components/loading-skeleton";

export default function BestMarketPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BestMarketForCrop />
    </Suspense>
  );
}
