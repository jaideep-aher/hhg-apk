"use client";

import React, { useState, useEffect } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { getMarketRates } from "@/server/dbfunctions";
import { CartesianGrid, Line, LineChart, LabelList, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const marketMapping = [
  { english: "pune", marathi: "पुणे" },
  { english: "mumbai", marathi: "मुंबई" },
  { english: "nagpur", marathi: "नागपूर" },
  { english: "chennai", marathi: "चेन्नई" },
];

const vegetables = [
  { id: 1, name: "फ्लॉवर" },
  { id: 2, name: "मिरची" },
  { id: 3, name: "कोबी" },
  { id: 4, name: "फरशी" },
  { id: 5, name: "गवार" },
  { id: 6, name: "चवळी" },
  { id: 7, name: "भेंडी" },
  { id: 8, name: "काकडी" },
  { id: 9, name: "वाटाणा" },
  { id: 10, name: "हिरवी वांगी" },
  { id: 11, name: "टोमॅटो" },
  { id: 12, name: "कांदा" },
  { id: 13, name: "आले" },
  { id: 14, name: "ढोबळी मिरची" },
  { id: 15, name: "लिंबू" },
  { id: 16, name: "पांढरी काकडी" },
  { id: 17, name: "बटाटा" },
  { id: 18, name: "गाजर" },
  { id: 19, name: "कारले" },
  { id: 20, name: "दोडका" },
  { id: 21, name: "डाळिंब" },
  { id: 22, name: "सफरचंद" },
  { id: 23, name: "नागपुरी संत्री" },
  { id: 24, name: "पपई" },
];

export default function DailyMarketRates() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedVegetable, setSelectedVegetable] = useState("");

  // Initialize from URL params
  useEffect(() => {
    const market = searchParams.get("market");
    const vegetable = searchParams.get("vegetable");

    if (market && marketMapping.some((m) => m.english === market)) {
      setSelectedMarket(market);
    }

    if (vegetable && vegetables.some((v) => v.id.toString() === vegetable)) {
      setSelectedVegetable(vegetable);
    }
  }, [searchParams]);

  const getMarathiMarketName = (englishName) => {
    return (
      marketMapping.find((m) => m.english === englishName)?.marathi ||
      englishName
    );
  };

  const updateURL = (market, vegetable) => {
    // Only update URL if both values are present
    if (market && vegetable) {
      const params = new URLSearchParams();
      params.set("market", market);
      params.set("vegetable", vegetable);
      router.push(`/dailyrate/market?${params.toString()}`);
    }
  };

  const handleMarketChange = (value) => {
    setSelectedMarket(value);
    if (selectedVegetable) {
      updateURL(value, selectedVegetable);
    }
  };

  const handleVegetableChange = (value) => {
    setSelectedVegetable(value);
    if (selectedMarket) {
      updateURL(selectedMarket, value);
    }
  };

  const {
    data: marketRates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["marketRates", selectedMarket, selectedVegetable],
    queryFn: () => getMarketRates(selectedMarket, selectedVegetable),
    enabled: Boolean(selectedMarket && selectedVegetable),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  });

  const searchResults = marketRates || [];

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div>Error fetching data: {error.message}</div>;

  const chartConfig = {
    min: {
      label: "किमान",
      color: "hsl(var(--chart-1))",
    },
    max: {
      label: "कमाल",
      color: "hsl(var(--chart-2))",
    },
    avg: {
      label: "सरासरी",
      color: "hsl(var(--chart-3))",
    },
  };

  const getPercentageChange = () => {
    if (!searchResults || searchResults.length < 2) return 0;
    const oldestAvg = searchResults.find(
      (result) =>
        result[`${selectedMarket}avg`] !== null &&
        result[`${selectedMarket}avg`] > 0
    )?.[`${selectedMarket}avg`];
    const newestAvg = [...searchResults]
      .reverse()
      .find(
        (result) =>
          result[`${selectedMarket}avg`] !== null &&
          result[`${selectedMarket}avg`] > 0
      )?.[`${selectedMarket}avg`];
    if (!oldestAvg || !newestAvg) return 0;
    return (((newestAvg - oldestAvg) / oldestAvg) * 100).toFixed(1);
  };

  const selectedVegetableName = vegetables.find(
    (v) => v.id.toString() === selectedVegetable
  )?.name;

  const hasData = searchResults.some(
    (result) =>
      result[`${selectedMarket}min`] !== null &&
      result[`${selectedMarket}max`] !== null &&
      result[`${selectedMarket}avg`] !== null &&
      (result[`${selectedMarket}min`] > 0 ||
        result[`${selectedMarket}max`] > 0 ||
        result[`${selectedMarket}avg`] > 0)
  );

  const sortedResults = [...searchResults].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-xl font-semibold">मार्केट आणि माल निवडा</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedMarket} onValueChange={handleMarketChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="मार्केट निवडा" />
              </SelectTrigger>
              <SelectContent>
                {marketMapping.map((market) => (
                  <SelectItem key={market.english} value={market.english}>
                    {market.marathi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedVegetable}
              onValueChange={handleVegetableChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="माल निवडा" />
              </SelectTrigger>
              <SelectContent>
                {vegetables.map((veg) => (
                  <SelectItem key={veg.id} value={veg.id.toString()}>
                    {veg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={refetch}
              disabled={!selectedMarket || !selectedVegetable || isLoading}
            >
              {isLoading ? "शोधत आहे..." : "शोधा"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {searchResults.length > 0 && (
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
                    {getMarathiMarketName(selectedMarket)} चे गेल्या ७ दिवसांचे{" "}
                    {selectedVegetableName} दर
                  </CardTitle>
                  <CardDescription>
                    {searchResults[0] &&
                      new Date(searchResults[0].date).toLocaleDateString(
                        "mr-IN",
                        {
                          day: "numeric",
                          month: "long",
                        }
                      )}{" "}
                    पासून {Math.abs(Number(getPercentageChange()))}%{" "}
                    {getPercentageChange() > 0 ? (
                      <span className="text-green-600 flex items-center">
                        भाव वाढला <TrendingUp className="h-4 w-4 ml-1" />
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        भाव कमी झाला <TrendingDown className="h-4 w-4 ml-1" />
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <LineChart
                      accessibilityLayer
                      data={searchResults}
                      margin={{
                        top: 25,
                        left: 12,
                        right: 12,
                      }}
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
                        dataKey={`${selectedMarket}max`}
                        type="monotone"
                        stroke="var(--color-max)"
                        strokeWidth={2}
                        dot={{
                          fill: "var(--color-max)",
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        connectNulls={true}
                      >
                        <LabelList
                          position="top"
                          offset={8}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Line>
                      <Line
                        dataKey={`${selectedMarket}avg`}
                        type="monotone"
                        stroke="var(--color-avg)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={true}
                      />
                      <Line
                        dataKey={`${selectedMarket}min`}
                        type="monotone"
                        stroke="var(--color-min)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>दैनिक किंमती</CardTitle>
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
                      {sortedResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(result.date).toLocaleDateString("en-IN")}
                          </TableCell>
                          <TableCell>
                            {result[`${selectedMarket}min`] !== null
                              ? `₹${result[`${selectedMarket}min`]}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {result[`${selectedMarket}max`] !== null
                              ? `₹${result[`${selectedMarket}max`]}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {result[`${selectedMarket}avg`] !== null
                              ? `₹${result[`${selectedMarket}avg`]}`
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
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
