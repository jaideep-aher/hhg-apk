"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSkeleton from "@/components/loading-skeleton";
import CommodityPicker from "@/components/CommodityPicker";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, LabelList, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  fetchMarkets,
  fetchCommodities,
  fetchPrices,
} from "@/lib/apmcApi";
import { formatAmount } from "@/lib/priceFormat";

/**
 * Marathi-first APMC rate explorer.
 *
 * Markets and commodities are loaded from the Express APMC API at runtime —
 * no hardcoded arrays — so adding a new mandi or crop is a one-row SQL insert
 * on the server, not a webapp deploy.
 *
 * Price data is fetched as a 7-day series from /api/apmc/prices, then rendered
 * as a min/max/modal line chart (recharts) plus a sortable daily table.
 */
export default function DailyMarketRates() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ["apmc", "markets"],
    queryFn: fetchMarkets,
    staleTime: 1000 * 60 * 10,
  });

  const { data: commodities = [], isLoading: commoditiesLoading } = useQuery({
    queryKey: ["apmc", "commodities"],
    queryFn: () => fetchCommodities(),
    staleTime: 1000 * 60 * 10,
  });

  const selectedMarket = searchParams.get("market") || "";
  const selectedCommodity = searchParams.get("commodity") || "";

  // Default-select the first market and commodity once the API responses land
  // (so a fresh open shows something instead of two empty dropdowns).
  useEffect(() => {
    if (
      (!selectedMarket && markets.length) ||
      (!selectedCommodity && commodities.length)
    ) {
      const params = new URLSearchParams(searchParams.toString());
      if (!selectedMarket && markets.length) {
        params.set("market", markets[0].slug);
      }
      if (!selectedCommodity && commodities.length) {
        params.set("commodity", commodities[0].slug);
      }
      router.replace(`/dailyrate/market?${params.toString()}`);
    }
  }, [markets, commodities, selectedMarket, selectedCommodity, router, searchParams]);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/dailyrate/market?${params.toString()}`);
  };

  const {
    data: priceResponse,
    isLoading: pricesLoading,
    error: pricesError,
    refetch,
  } = useQuery({
    queryKey: ["apmc", "prices", selectedMarket, selectedCommodity],
    queryFn: () =>
      fetchPrices({
        market: selectedMarket,
        commodity: selectedCommodity,
        days: 7,
      }),
    enabled: Boolean(selectedMarket && selectedCommodity),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  });

  const rows = priceResponse?.rows || [];

  const selectedMarketRow = useMemo(
    () => markets.find((m) => m.slug === selectedMarket),
    [markets, selectedMarket]
  );
  const selectedCommodityRow = useMemo(
    () => commodities.find((c) => c.slug === selectedCommodity),
    [commodities, selectedCommodity]
  );

  const hasData = rows.some(
    (r) =>
      (Number(r.minPrice) || 0) > 0 ||
      (Number(r.maxPrice) || 0) > 0 ||
      (Number(r.modalPrice) || 0) > 0
  );

  const getPercentageChange = () => {
    if (!rows.length) return 0;
    const oldestModal = rows.find((r) => Number(r.modalPrice) > 0)?.modalPrice;
    const newestModal = [...rows]
      .reverse()
      .find((r) => Number(r.modalPrice) > 0)?.modalPrice;
    if (!oldestModal || !newestModal) return 0;
    return (((newestModal - oldestModal) / oldestModal) * 100).toFixed(1);
  };

  const chartConfig = {
    minPrice: { label: "किमान", color: "hsl(var(--chart-1))" },
    maxPrice: { label: "कमाल", color: "hsl(var(--chart-2))" },
    modalPrice: { label: "सरासरी", color: "hsl(var(--chart-3))" },
  };

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [rows]
  );

  if (marketsLoading || commoditiesLoading) return <LoadingSkeleton />;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-xl font-semibold">मार्केट आणि माल निवडा</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedMarket}
              onValueChange={(v) => setParam("market", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="मार्केट निवडा" />
              </SelectTrigger>
              <SelectContent>
                {markets.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    {m.nameMr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CommodityPicker
              commodities={commodities}
              value={selectedCommodity}
              onChange={(v) => setParam("commodity", v)}
              placeholder="माल निवडा — शोधा किंवा बोला"
            />
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => refetch()}
              disabled={!selectedMarket || !selectedCommodity || pricesLoading}
            >
              {pricesLoading ? "शोधत आहे..." : "शोधा"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {pricesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>माहिती मिळाली नाही</AlertTitle>
          <AlertDescription>
            कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col space-y-4">
          {!hasData && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>माहिती उपलब्ध नाही</AlertTitle>
              <AlertDescription>
                निवडलेल्या मार्केट आणि मालासाठी कोणतीही माहिती उपलब्ध नाही.
                कृपया दुसरा मार्केट किंवा माल निवडा.
              </AlertDescription>
            </Alert>
          )}
          {hasData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">
                    {selectedMarketRow?.nameMr || selectedMarket} चे गेल्या ७
                    दिवसांचे{" "}
                    {selectedCommodityRow?.nameMr || selectedCommodity} दर
                  </CardTitle>
                  <CardDescription>
                    {rows[0] &&
                      new Date(rows[0].date).toLocaleDateString("mr-IN", {
                        day: "numeric",
                        month: "long",
                      })}{" "}
                    पासून {Math.abs(Number(getPercentageChange()))}%{" "}
                    {Number(getPercentageChange()) > 0 ? (
                      <span className="text-green-600 inline-flex items-center">
                        भाव वाढला <TrendingUp className="h-4 w-4 ml-1" />
                      </span>
                    ) : (
                      <span className="text-red-600 inline-flex items-center">
                        भाव कमी झाला <TrendingDown className="h-4 w-4 ml-1" />
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <LineChart
                      accessibilityLayer
                      data={rows}
                      margin={{ top: 25, left: 12, right: 12 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-IN", {
                            day: "numeric",
                          })
                        }
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />
                      <Line
                        dataKey="maxPrice"
                        type="monotone"
                        stroke="var(--color-maxPrice)"
                        strokeWidth={2}
                        dot={{ fill: "var(--color-maxPrice)" }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      >
                        <LabelList
                          position="top"
                          offset={8}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Line>
                      <Line
                        dataKey="modalPrice"
                        type="monotone"
                        stroke="var(--color-modalPrice)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Line
                        dataKey="minPrice"
                        type="monotone"
                        stroke="var(--color-minPrice)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>दैनिक किंमती</CardTitle>
                  <CardDescription>
                    ₹ प्रति क्विंटल (१०० किलो) · किलोचा दर पाहण्यासाठी
                    सरासरीला १०० ने भागा
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>दिनांक</TableHead>
                        <TableHead>किमान</TableHead>
                        <TableHead>कमाल</TableHead>
                        <TableHead>सरासरी</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRows.map((r) => {
                        const modalNum = Number(r.modalPrice) || 0;
                        return (
                          <TableRow key={r.date}>
                            <TableCell>
                              {new Date(r.date).toLocaleDateString("en-IN")}
                            </TableCell>
                            <TableCell>{formatAmount(r.minPrice)}</TableCell>
                            <TableCell>{formatAmount(r.maxPrice)}</TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatAmount(r.modalPrice)}
                              </div>
                              {modalNum > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  ≈ ₹{(modalNum / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/kg
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
