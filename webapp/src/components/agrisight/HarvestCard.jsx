import React from "react";
import { Calendar, TrendingUp, TrendingDown, Leaf } from "lucide-react";

export const HarvestCard = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-pulse h-[200px]">
        <div className="h-6 bg-gray-100 w-1/2 rounded mb-4"></div>
        <div className="h-4 bg-gray-100 w-full rounded mb-2"></div>
        <div className="h-4 bg-gray-100 w-2/3 rounded"></div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Leaf size={20} />
            </div>
            <h3 className="font-bold text-gray-800">काढणीसाठी सर्वोत्तम वेळ</h3>
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${
              analysis.yoyGrowth >= 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {analysis.yoyGrowth >= 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {Math.abs(analysis.yoyGrowth)}% YoY (तुलनात्मक)
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/60 p-3 rounded-lg border border-emerald-50/50">
            <span className="text-xs text-gray-500 uppercase font-semibold">
              उत्तम दर (Best Price)
            </span>
            <div className="text-lg font-bold text-gray-800 mt-1">
              {analysis.bestPriceMonths.join(", ")}
            </div>
          </div>
          <div className="bg-white/60 p-3 rounded-lg border border-emerald-50/50">
            <span className="text-xs text-gray-500 uppercase font-semibold">
              जास्त आवक (Max Vol)
            </span>
            <div className="text-lg font-bold text-gray-800 mt-1">
              {analysis.bestVolumeMonths.join(", ")}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed border-t border-emerald-100/50 pt-3">
          {analysis.recommendation}
        </p>
      </div>

      {/* Decorative background leaf */}
      <Leaf
        className="absolute -bottom-6 -right-6 text-emerald-50 transform -rotate-12"
        size={140}
      />
    </div>
  );
};
