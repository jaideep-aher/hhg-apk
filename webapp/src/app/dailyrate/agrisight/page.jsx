"use client";
import React, { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  ChevronDown,
  Search,
  Sprout,
  Filter,
  Lightbulb,
  AlertCircle,
  Table,
  BarChart2,
  Sparkles,
  Settings,
  X,
} from "lucide-react";
import {
  fetchItemOptions,
  fetchMarketTrends,
  fetchHarvestAnalysis,
} from "@/server/agrisight";
import { generateMarketAnalysis } from "@/lib/aiService";
import { StatsCard } from "@/components/agrisight/StatsCard";
import { ChartSection } from "@/components/agrisight/ChartSection";
import { DataGrid } from "@/components/agrisight/DataGrid";
import { HarvestCard } from "@/components/agrisight/HarvestCard";

const MONTHLY = "monthly";
const QUARTERLY = "quarterly";
const HALF_YEARLY = "half_yearly";
const YEARLY = "yearly";
const CUSTOM = "custom";

const DAILY = "daily";
const WEEKLY = "weekly";
// Display mapping for Marathi
const TIME_FRAME_LABELS = {
  [MONTHLY]: "मासिक (1M)",
  [QUARTERLY]: "त्रैमासिक (3M)",
  [HALF_YEARLY]: "सहामाही (6M)",
  [YEARLY]: "वार्षिक (1Y)",
  [CUSTOM]: "कस्टम",
};

const INTERVAL_LABELS = {
  [DAILY]: "दैनिक (Daily)",
  [WEEKLY]: "साप्ताहिक (Weekly)",
  [MONTHLY]: "मासिक (Monthly)",
};

export default function App() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");

  // Date & Interval State
  const [timeFrame, setTimeFrame] = useState(MONTHLY);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dataInterval, setDataInterval] = useState(DAILY);

  // View Toggle
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Chart Settings
  const [chartSettings, setChartSettings] = useState({
    type: "area",
    colors: {
      avg: "#059669", // emerald-600
      max: "#86efac", // emerald-300
      min: "#34d399", // emerald-400
    },
  });

  const [marketData, setMarketData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [harvestAnalysis, setHarvestAnalysis] = useState(null);

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Helper to set dates based on TimeFrame preset
  const applyTimeFrame = (tf) => {
    const end = new Date();
    const start = new Date();

    if (tf === MONTHLY) {
      start.setMonth(end.getMonth() - 1);
      setDataInterval(DAILY);
    }
    if (tf === QUARTERLY) {
      start.setMonth(end.getMonth() - 3);
      setDataInterval(WEEKLY);
    }
    if (tf === HALF_YEARLY) {
      start.setMonth(end.getMonth() - 6);
      setDataInterval(WEEKLY);
    }
    if (tf === YEARLY) {
      start.setFullYear(end.getFullYear() - 1);
      setDataInterval(MONTHLY);
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
    setTimeFrame(tf);
  };

  useEffect(() => {
    applyTimeFrame(MONTHLY);

    const loadItems = async () => {
      try {
        const data = await fetchItemOptions();
        setItems(data);
        if (data.length > 0) {
          setSelectedItem(data[0].canonicalName);
        }
      } catch (error) {
        console.error("Failed to load items", error);
      } finally {
        setIsLoadingItems(false);
      }
    };
    loadItems();
  }, []);

  useEffect(() => {
    if (!selectedItem || !startDate || !endDate) return;

    const loadMarketData = async () => {
      setIsLoadingData(true);
      setAiAnalysis(null); // Reset AI analysis on data change
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Fetch Trends
        const { history, summary } = await fetchMarketTrends(
          selectedItem,
          start,
          end,
          dataInterval
        );
        setMarketData(history);
        setSummary(summary);

        // Fetch Harvest Analysis (independent)
        const analysis = await fetchHarvestAnalysis(selectedItem);
        setHarvestAnalysis(analysis);
      } catch (error) {
        console.error("Failed to fetch market data", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadMarketData();
  }, [selectedItem, startDate, endDate, dataInterval]);

  const handleDateChange = (type, value) => {
    if (type === "start") setStartDate(value);
    else setEndDate(value);
    setTimeFrame(CUSTOM);
  };

  const handleAiAnalysis = async () => {
    if (marketData.length === 0) return;
    setIsAiLoading(true);
    const result = await generateMarketAnalysis(
      selectedItem,
      marketData,
      dataInterval
    );
    setAiAnalysis(result);
    setIsAiLoading(false);
  };

  // Calculate percentage difference for Historical Context
  const getHistoricalDiff = () => {
    if (!summary || !summary.historicalAvgRate) return 0;
    return (
      ((summary.currentAvg - summary.historicalAvgRate) /
        summary.historicalAvgRate) *
      100
    );
  };

  const histDiff = getHistoricalDiff();

  return (
    <div className="mb-8">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              बाजार भाव आणि स्मार्ट अंदाज
            </h1>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm"
                title="आलेख सेटिंग्ज"
              >
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm text-gray-800">
                      आलेख सेटिंग्ज
                    </h4>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-2 block">
                        आलेख प्रकार (Chart Style)
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setChartSettings((prev) => ({
                              ...prev,
                              type: "area",
                            }))
                          }
                          className={`flex-1 py-1 text-xs rounded border ${
                            chartSettings.type === "area"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          Area
                        </button>
                        <button
                          onClick={() =>
                            setChartSettings((prev) => ({
                              ...prev,
                              type: "line",
                            }))
                          }
                          className={`flex-1 py-1 text-xs rounded border ${
                            chartSettings.type === "line"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          Line
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 font-semibold mb-2 block">
                        रंग (Colors)
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            सरासरी दर
                          </span>
                          <input
                            type="color"
                            value={chartSettings.colors.avg}
                            onChange={(e) =>
                              setChartSettings((prev) => ({
                                ...prev,
                                colors: { ...prev.colors, avg: e.target.value },
                              }))
                            }
                            className="h-6 w-8 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">कमाल दर</span>
                          <input
                            type="color"
                            value={chartSettings.colors.max}
                            onChange={(e) =>
                              setChartSettings((prev) => ({
                                ...prev,
                                colors: { ...prev.colors, max: e.target.value },
                              }))
                            }
                            className="h-6 w-8 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            किमान दर
                          </span>
                          <input
                            type="color"
                            value={chartSettings.colors.min}
                            onChange={(e) =>
                              setChartSettings((prev) => ({
                                ...prev,
                                colors: { ...prev.colors, min: e.target.value },
                              }))
                            }
                            className="h-6 w-8 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              {showDetailedView ? <BarChart2 size={16} /> : <Table size={16} />}
              {showDetailedView ? "आलेख पहा" : "तपशील पहा"}
            </button>
          </div>
        </div>

        {/* Controls / Filter Bar */}
        <div className=" bg-white p-4 rounded-xl shadow-md border border-slate-100 mb-8 flex flex-col xl:flex-row gap-4 justify-between items-center transition-all">
          {/* Item Selector */}
          <div className="w-full xl:w-1/4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            {isLoadingItems ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-full"></div>
            ) : (
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg border bg-gray-50 hover:bg-white transition-colors cursor-pointer appearance-none font-medium text-slate-700"
              >
                {items.map((group) => (
                  <option key={group.canonicalName} value={group.canonicalName}>
                    {group.canonicalName}
                  </option>
                ))}
              </select>
            )}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
            {/* Presets */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
              {[MONTHLY, QUARTERLY, YEARLY].map((tf) => (
                <button
                  key={tf}
                  onClick={() => applyTimeFrame(tf)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all duration-200 ${
                    timeFrame === tf
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {TIME_FRAME_LABELS[tf]}
                </button>
              ))}
            </div>

            {/* Interval Selector */}
            <div className="relative w-full md:w-32">
              <select
                value={dataInterval}
                onChange={(e) => setDataInterval(e.target.value)}
                className="block w-full px-3 py-2 text-xs font-semibold border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <option value={DAILY}>{INTERVAL_LABELS[DAILY]}</option>
                <option value={WEEKLY}>{INTERVAL_LABELS[WEEKLY]}</option>
                <option value={MONTHLY}>{INTERVAL_LABELS[MONTHLY]}</option>
              </select>
            </div>

            {/* Date Inputs */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none w-full md:w-28"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none w-full md:w-28"
              />
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            label="सरासरी दर (Avg Rate)"
            value={`₹${summary?.currentAvg ?? 0}`}
            subValue="/ kg"
            trend={summary?.trendDirection}
            trendValue={`${Math.abs(summary?.priceChangePercentage ?? 0)}%`}
            color={summary?.trendDirection === "down" ? "rose" : "emerald"}
          />
          <StatsCard
            label="कमाल दर (High)"
            value={`₹${summary?.currentHigh ?? 0}`}
            subValue="/ kg"
            color="blue"
          />
          <StatsCard
            label="किमान दर (Low)"
            value={`₹${summary?.currentLow ?? 0}`}
            subValue="/ kg"
            color="rose"
          />
          <StatsCard
            label="एकूण आवक (Total Vol)"
            value={summary?.totalVolume.toLocaleString() ?? 0}
            subValue="Kg"
            color="amber"
          />
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Visual: Chart or Grid */}
          <div className="xl:col-span-2 flex flex-col">
            {showDetailedView ? (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  तपशीलवार बाजार माहिती (Detailed Data)
                </h3>
                <DataGrid data={marketData} />
              </div>
            ) : (
              <ChartSection
                data={marketData}
                isLoading={isLoadingData}
                settings={chartSettings}
              />
            )}

            {/* New Harvest Analysis Section Below Chart */}
            <div className="mt-6">
              <HarvestCard
                analysis={harvestAnalysis}
                isLoading={isLoadingData}
              />
            </div>
          </div>

          {/* Insights / Side Panel */}
          <div className="space-y-6">
            {/* Quick Insights Card */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="text-amber-500" size={20} />
                  <h3 className="font-bold text-gray-800">
                    स्मार्ट अंदाज (Insights)
                  </h3>
                </div>
                {!aiAnalysis && (
                  <button
                    onClick={handleAiAnalysis}
                    disabled={isAiLoading}
                    className="text-xs flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-700 disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    {isAiLoading ? "विश्लेषण चालू..." : "AI ला विचारा"}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Rule-based Insight */}
                <div
                  className={`p-4 rounded-lg border ${
                    summary?.trendDirection === "down"
                      ? "bg-rose-50 border-rose-100"
                      : summary?.trendDirection === "up"
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 ${
                        summary?.trendDirection === "down"
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {summary?.trendDirection === "down" ? (
                        <TrendingDown size={20} />
                      ) : (
                        <TrendingUp size={20} />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`font-semibold text-sm mb-1 ${
                          summary?.trendDirection === "down"
                            ? "text-rose-900"
                            : "text-emerald-900"
                        }`}
                      >
                        {summary?.trendDirection === "down"
                          ? "दर घसरण सूचना"
                          : "बाजार तेजी"}
                      </h4>
                      <p
                        className={`text-sm leading-relaxed ${
                          summary?.trendDirection === "down"
                            ? "text-rose-800"
                            : "text-emerald-800"
                        }`}
                      >
                        {selectedItem} दरांमध्ये या कालावधीत{" "}
                        {Math.abs(summary?.priceChangePercentage ?? 0)}%{" "}
                        {summary?.trendDirection === "down" ? "घट" : "वाढ"} झाली
                        आहे.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI / Prediction Box */}
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      <Sparkles size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-indigo-900 mb-1">
                        बाजार अंदाज (Market Prediction)
                      </h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">
                        {aiAnalysis || summary?.prediction}
                      </p>
                      {aiAnalysis && (
                        <div className="mt-2 text-xs text-indigo-400">
                          Analysis generated by Gemini AI
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Context Card - Now Dynamic */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 mb-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                ऐतिहासिक संदर्भ (History)
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      मागील वर्षी याच कालावधीत
                    </span>
                    <span
                      className={`font-semibold ${
                        histDiff >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {histDiff >= 0 ? "+" : ""}
                      {histDiff.toFixed(1)}%
                    </span>
                  </div>
                  {/* Visual bar comparing current vs historical */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs w-10 text-gray-400">मागील</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gray-400 h-2 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs w-10 text-gray-400">सध्या</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`${
                          histDiff >= 0 ? "bg-emerald-500" : "bg-rose-500"
                        } h-2 rounded-full`}
                        style={{ width: `${Math.min(100, 100 + histDiff)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    मागील वर्षी याच कालावधीत सरासरी दर ₹
                    {summary?.historicalAvgRate}/kg होता.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
