import React from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Finding payloads by name/dataKey for robustness
    const max = payload.find((p) => p.dataKey === "maxRate");
    const min = payload.find((p) => p.dataKey === "minRate");
    const avg = payload.find((p) => p.dataKey === "avgRate");

    return (
      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl min-w-[200px] z-50">
        <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
          {label}
        </p>
        <div className="space-y-2">
          {max && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">कमाल दर</span>
              <span
                className="font-bold"
                style={{ color: max.stroke || max.fill }}
              >
                ₹{max.value}/kg
              </span>
            </div>
          )}
          {avg && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">सरासरी दर</span>
              <span
                className="font-bold"
                style={{ color: avg.stroke || avg.fill }}
              >
                ₹{avg.value}/kg
              </span>
            </div>
          )}
          {min && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">किमान दर</span>
              <span
                className="font-bold"
                style={{ color: min.stroke || min.fill }}
              >
                ₹{min.value}/kg
              </span>
            </div>
          )}
          {payload[0]?.payload?.volume && (
            <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-sm">
              <span className="text-amber-600 font-medium">आवक (Volume)</span>
              <span className="font-bold text-slate-700">
                {payload[0].payload.volume.toLocaleString()} kg
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const ChartSection = ({ data, isLoading, settings }) => {
  if (isLoading) {
    return (
      <div className="h-[400px] w-full bg-gray-50 rounded-xl animate-pulse flex items-center justify-center border border-gray-100">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-gray-400 font-medium">
            माहिती लोड होत आहे...
          </span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] w-full bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
        <span className="text-gray-400 font-medium">
          निवडलेल्या कालावधीसाठी माहिती उपलब्ध नाही
        </span>
      </div>
    );
  }

  const commonProps = {
    data,
    margin: { top: 10, right: 10, left: 0, bottom: 0 },
  };

  const axisAndGrid = () => (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
      <XAxis
        dataKey="date"
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
        dy={10}
        minTickGap={30}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#64748b", fontSize: 12 }}
        unit="₹"
        width={40}
        domain={["auto", "auto"]}
      />
      <Tooltip
        content={<CustomTooltip />}
        cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
      />
    </>
  );

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            बाजार भाव कल (Price Trend)
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            दर प्रति किलो (Kg) मध्ये दर्शविले आहेत
          </p>
        </div>
        <div className="flex gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: settings.colors.avg }}
            ></span>
            <span className="text-gray-600">सरासरी दर</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {settings.type === "area" ? (
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={settings.colors.avg}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={settings.colors.avg}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              {axisAndGrid()}
              {/* Ranges */}
              <Area
                type="monotone"
                dataKey="maxRate"
                stroke={settings.colors.max}
                strokeDasharray="4 4"
                fill={settings.colors.max}
                fillOpacity={0.1}
                name="Max Rate"
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="avgRate"
                stroke={settings.colors.avg}
                strokeWidth={3}
                fill="url(#colorAvg)"
                name="Avg Rate"
                activeDot={{ r: 6, strokeWidth: 0, fill: settings.colors.avg }}
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="minRate"
                stroke={settings.colors.min}
                strokeDasharray="4 4"
                strokeWidth={2}
                fill="transparent"
                name="Min Rate"
                animationDuration={1000}
              />
            </AreaChart>
          ) : (
            <LineChart {...commonProps}>
              {axisAndGrid()}
              <Line
                type="monotone"
                dataKey="maxRate"
                stroke={settings.colors.max}
                strokeDasharray="4 4"
                strokeWidth={1}
                dot={false}
                name="Max Rate"
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="avgRate"
                stroke={settings.colors.avg}
                strokeWidth={3}
                dot={{ r: 2 }}
                activeDot={{ r: 6 }}
                name="Avg Rate"
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="minRate"
                stroke={settings.colors.min}
                strokeDasharray="4 4"
                strokeWidth={1}
                dot={false}
                name="Min Rate"
                animationDuration={1000}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
