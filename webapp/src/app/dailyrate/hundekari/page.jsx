"use client";
import React, { useState } from "react";
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
import LoadingSkeleton from "@/components/loading-skeleton";
import { useQuery } from "@tanstack/react-query";
import { getAllItems, getVendorItemRatesForItem } from "@/server/dbfunctions";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  YAxis,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

export default function Component() {
  const [selectedItem, setSelectedItem] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showNewBranchPopup, setShowNewBranchPopup] = useState(true);
  const closeNewBranchPopup = () => setShowNewBranchPopup(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["items", {}],
    queryFn: () => getAllItems(),
    staleTime: 1000 * 60 * 60 * 24,
    cacheTime: 1000 * 60 * 60 * 24,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div>Error fetching data: {error.message}</div>;

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoadingData(true);

    // 🔥 Track search event in PostHog
    posthog.capture("item_rate_search", {
      item: selectedItem, // which item user searched
      timestamp: new Date().toISOString(), // optional
    });

    try {
      const data = await getVendorItemRatesForItem(selectedItem);
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSearchResults(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold text-center">दैनिक मार्केट भाव</h1>
      {/* <Dialog open={showNewBranchPopup} onOpenChange={setShowNewBranchPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>साकुरमध्ये नवीन शाखा सुरू!</DialogTitle>
            <DialogDescription>
            आता आपण तरकारी माल साकूरच्या शाखेत हि टाकू शकता.
            पत्ता: श्री राम कृषी सेवा समोर, मुख्य बाजार, साकुर </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeNewBranchPopup}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
      <div className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-2xl font-semibold">माल निवडा</h2>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedItem}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                {data.map((item) => (
                  <SelectItem key={item.item} value={item.item}>
                    {item.item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleSearch}
              disabled={!selectedItem || isLoading || isLoadingData}
            >
              {isLoading || isLoadingData ? "Searching..." : "Search"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {searchResults.length > 0 && (
        <div className="flex flex-col space-y-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Price Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <TableView data={searchResults} />
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Vendor Rate Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartView data={searchResults} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TableView({ data }) {
  const groupedData = groupByDate(data);
  // console.log(groupedData);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">दिनांक</TableHead>
            <TableHead>दलाल</TableHead>
            <TableHead className="text-right">भाव</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedData).map(([date, vendors]) => (
            <React.Fragment key={date}>
              {vendors.map((vendor, index) => (
                <TableRow
                  key={`${date}-${index}`}
                  className={cn(
                    index === vendors.length - 1 && "border-b-2 border-b-muted"
                  )}
                >
                  {index === 0 && (
                    <TableCell className="font-medium" rowSpan={vendors.length}>
                      {formatDate(date)}
                    </TableCell>
                  )}
                  <TableCell>{vendor.vendorname}</TableCell>
                  <TableCell className="text-right">
                    ₹{vendor.highest_rate}
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function groupByDate(data) {
  return data.reduce((acc, curr) => {
    if (!acc[curr.date]) {
      acc[curr.date] = [];
    }
    acc[curr.date].push(curr);
    return acc;
  }, {});
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-IN", options);
}

function BarChartView({ data }) {
  const groupedData = groupByDateAndVendor(data);
  const allVendors = getAllVendors(data);
  const colors = ["#7CC674", "#73C5C5", "#EC7A08", "#A30000", "#B8BBBE"];

  const chartData = Object.entries(groupedData).map(([date, vendors]) => ({
    date,
    ...allVendors.reduce((acc, vendor) => {
      acc[vendor] = vendors[vendor] || null;
      return acc;
    }, {}),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded shadow">
          <p className="font-bold">{label}</p>
          {payload.map(
            (entry, index) =>
              entry.value !== null && (
                <p key={index} style={{ color: entry.color }}>
                  {`${entry.name}: ${entry.value}`}
                </p>
              )
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer
      className="overflow-x-auto p-0"
      width="100%"
      height={500}
    >
      <BarChart data={chartData}>
        <XAxis
          dataKey="date"
          // tickFormatter={(value) => new Date(value).toLocaleDateString("en-IN")}
        />
        <YAxis
          domain={[0, "dataMax"]}
          width={25}
          // font size and padding decreas
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {allVendors.map((vendor, index) => (
          <Bar
            barSize={20}
            key={vendor}
            dataKey={vendor}
            fill={colors[index % colors.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function groupByDateAndVendor(data) {
  return data.reduce((acc, curr) => {
    if (
      !acc[
        curr.date.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        })
      ]
    ) {
      acc[
        curr.date?.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        })
      ] = {};
    }
    acc[
      curr.date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      })
    ][curr.vendorname] = Number(curr.highest_rate).toFixed(0);
    return acc;
  }, {});
}

function getAllVendors(data) {
  return [...new Set(data.map((item) => item.vendorname))];
}
