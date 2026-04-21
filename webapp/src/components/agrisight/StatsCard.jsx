import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export const StatsCard = ({
  label,
  value,
  subValue,
  trend,
  trendValue,
  color = "emerald",
}) => {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100",
    blue: "bg-blue-50 text-blue-900 border-blue-100",
    amber: "bg-amber-50 text-amber-900 border-amber-100",
    rose: "bg-rose-50 text-rose-900 border-rose-100",
  };

  const trendColors = {
    up: "text-emerald-600",
    down: "text-rose-600",
    stable: "text-gray-500",
  };

  return (
    <div
      className={`p-6 rounded-xl border ${colors[color]} shadow-sm transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium opacity-80 uppercase tracking-wide">
          {label}
        </h3>
        {trend && (
          <div
            className={`flex items-center text-xs font-bold ${trendColors[trend]} bg-white/60 px-2 py-1 rounded-full`}
          >
            {trend === "up" && <ArrowUpRight size={14} className="mr-1" />}
            {trend === "down" && <ArrowDownRight size={14} className="mr-1" />}
            {trend === "stable" && <Minus size={14} className="mr-1" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {subValue && (
          <span className="text-sm opacity-70 font-medium">{subValue}</span>
        )}
      </div>
    </div>
  );
};
