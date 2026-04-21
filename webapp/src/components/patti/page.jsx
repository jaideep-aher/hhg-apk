"use client";

import { useState, useEffect } from "react";
import {
  Bar,
  Line,
  ComposedChart,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
} from "@/components/ui/chart";
import { ChartConfig } from "@/components/ui/chart";

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  IndianRupee,
  LeafyGreen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  getFarmerDataUsingId,
  getFarmerMonthlyIncomeDataUsingId,
} from "@/server/dbfunctions";
import { set } from "date-fns";

/**
 * Farmer data display page.
 *
 * @export
 * @returns {*}
 */
export default function Page() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [filteredPattiData, setFilteredPattiData] = useState([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("week");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "ascending",
  });
  const today = new Date();
  const eDt = today.toISOString().split("T")[0];
  const stDT = new Date(today - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const [startDate, setStartDate] = useState(stDT);
  const [endDate, setEndDate] = useState(eDt);

  const itemsPerPage = 5;

  const [pattiData, setPattiData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [thisWeekData, setThisWeekData] = useState(0);
  const [thisMonthData, setThisMonthData] = useState(0);
  const [increaseThisMonth, setIncreaseThisMonth] = useState(0);
  const [chartDataMin, setChartDataMin] = useState(0);
  const [chartDataMax, setChartDataMax] = useState(0);
  const chartConfig = {
    payable: {
      label: "Income",
      color: "#f97316",
    },
    quantity: {
      label: "Quantity",
      color: "#f9a826",
    },
  };

  /**
   * Updates start and end dates based on the selected time frame.
   * This effect runs whenever the selectedTimeFrame changes.
   * It calculates the start and end dates for week, month, or year time frames
   * relative to the current date and updates the state accordingly.
   *
   * @effect Updates startDate and endDate state based on selectedTimeFrame.
   * @dependsOn selectedTimeFrame - The currently selected time frame ("week", "month", "year").
   */
  useEffect(() => {
    if (selectedTimeFrame === "week") {
      const today = new Date();
      const eDt = today.toISOString().split("T")[0];
      const stDT = new Date(today - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      setStartDate(stDT);
      setEndDate(eDt);
    }
    if (selectedTimeFrame === "month") {
      const today = new Date();
      const eDt = today.toISOString().split("T")[0];
      const stDT = new Date(today - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      setStartDate(stDT);
      setEndDate(eDt);
    }
    if (selectedTimeFrame === "year") {
      const today = new Date();
      const eDt = today.toISOString().split("T")[0];
      const stDT = new Date(today - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      setStartDate(stDT);
      setEndDate(eDt);
    }
  }, [selectedTimeFrame]);

  /**
   * Fetches farmer data based on the selected time frame.
   * This effect runs whenever the start or end date changes.
   * It fetches farmer data based on the selected time frame and updates the state accordingly.
   */
  useEffect(() => {
    getFarmerMonthlyIncomeDataUsingId({ uid: "1460" })
      .then((data) => {
        // Helper function to convert YYYY-MM to month name
        const getMonthName = (monthString) => {
          const date = new Date(monthString);
          return date.toLocaleString("default", {
            month: "long",
            year: "numeric",
          });
        };

        // calculate min and max values for the chart
        const min = Math.min(...data.map((item) => item.payable));
        const max = Math.max(...data.map((item) => item.payable));
        setChartDataMin(min);
        setChartDataMax(max);

        // Modify the data array to include month names
        const modifiedData = data.map((item) => ({
          ...item,
          month: getMonthName(item.month),
        }));

        // Calculate the total payable for the current month
        const d = modifiedData.length - 1;
        const thisMonth = Number(modifiedData[d].payable) || 0;
        console.log("thisMonth", thisMonth);
        setThisMonthData(thisMonth);

        // Calculate the percentage increase from the previous month
        const lastMonth = Number(data[data.length - 2]?.payable) || 0;
        console.log("lastMonth", lastMonth);
        const increase = ((thisMonth - lastMonth) / lastMonth) * 100;
        console.log("increase", increase);
        setIncreaseThisMonth(increase);

        setChartData(modifiedData);

        console.log("modifyied", modifiedData);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  /**
   * Fetches farmer data based on the selected time frame.
   * This effect runs whenever the start or end date changes.
   * It fetches farmer data based on the selected time frame and updates the state accordingly.
   */
  useEffect(() => {

    getFarmerDataUsingId({
      uid: "1460",
      fromDate: startDate,
      toDate: endDate,
    })
      .then((data) => {
        console.log(data);

        // Calculate the total payable for the current week
        if(selectedTimeFrame === "week" && data.length > 0) {
        const thisWeek = data
            .filter((order) => order.date >= startDate && order.date <= endDate)
            .reduce((acc, order) => acc + order.payable, 0);
        setThisWeekData(thisWeek);}


        

        if (data.length === 0) {
          if (selectedTimeFrame === "week") {
            setSelectedTimeFrame("month");
          }
        } else {
          setPattiData(data);
        }
      })
      .catch((err) => {
        console.error(err);
      });

  }, [startDate, endDate, selectedTimeFrame]);

  useEffect(() => {
    const filtered = pattiData.filter(
      (order) =>
        order.vendorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPattiData(filtered);
    setCurrentPage(1);
  }, [searchTerm, pattiData]);

  useEffect(() => {
    if (sortConfig.key) {
      const sortedData = filteredPattiData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
      setFilteredPattiData(sortedData);
    }
  }, [sortConfig, filteredPattiData]);

  const pageCount = Math.ceil(filteredPattiData.length / itemsPerPage);
  const paginatedPattiData = filteredPattiData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  /**
   * Sorts the table based on the key and direction.
   * This effect runs whenever the sortConfig changes.
   * It sorts the table based on the key and direction and updates the state accordingly.
   */
  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };
  const handleExport = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [
        [
          "Date",
          "Vendor Name",
          "Quantity",
          "Weight",
          "Type of Produce",
          "Nett Payable",
          "Paid Status",
          "Paid Date",
        ],
      ],
      body: filteredPattiData.map((order) => [
        order.date,
        order.vendorname,
        order.quantity,
        `${order.weight} kg`,
        order.item,
        `₹${order.payable.toLocaleString("en-IN")}`,
        order.paid ? "Paid" : "Unpaid",
        order.paiddate || "-",
      ]),
    });
    doc.save("patti_data_export.pdf");
  };

  return (
    <div className="container mx-auto p-2">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="col-span-full md:col-span-2 lg:col-span-3 xl:col-span-2 overflow-x-auto">
          <CardHeader className="pb-3">
            <CardTitle>Income and Expenses</CardTitle>
            <CardDescription className="max-w-lg text-overflow leading-relaxed">
              Overview of your farms finances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="h-[200px] md:h-[300px] "
            >
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={true}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickLine={true}
                  tickMargin={2}
                  axisLine={false}
                  tickFormatter={(value) =>
                    Number(value).toLocaleString("en-IN")
                  }
                  domain={[Math.abs(chartDataMin - 1000), chartDataMax + 1500]}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        // icon and label for each data point

                        <div className="flex min-w-[130px] items-center text-xs text-muted-foreground">
                          {name === "payable" ? (
                            <IndianRupee className="h-4 w-4" />
                          ) : (
                            <LeafyGreen className="h-4 w-4" />
                          )}
                          {chartConfig[name]?.label || name}
                          {/* show icon based on name */}

                          <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                            {Number(value).toLocaleString("en-IN")}
                            {/* if name == payable then show rs otherwise show bags */}
                            <span className="font-normal text-muted-foreground">
                              {name === "payable" ? "₹" : "bags"}
                            </span>
                          </div>
                        </div>
                      )}
                    />
                  }
                  cursor={false}
                  defaultIndex={1}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="payable" fill="var(--color-payable)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="hidden">
          <CardHeader className="pb-2">
            <CardDescription>This Week</CardDescription>
            <CardTitle className="text-4xl">{thisWeekData>0 ? "Rs." + thisWeekData : "-"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              +from last week
            </div>
          </CardContent>
          <CardFooter>
            <Progress value={25} aria-label="25% increase" />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Month</CardDescription>
            <CardTitle className="text-4xl">{thisMonthData>0 ? "Rs." + thisMonthData : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
                {increaseThisMonth > 0 ? "+" : ""}
                {Number(increaseThisMonth).toFixed(2)}% from last month
            </div>
          </CardContent>
          <CardFooter>
            <Progress value={Math.abs(increaseThisMonth)} aria-label="{}% increase" />
          </CardFooter>
        </Card>
      </div>

      <Card className="mt-2">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Manage and view your recent orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTimeFrame} onValueChange={setSelectedTimeFrame}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
              <TabsList className="mb-4 sm:mb-0">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-1">
                {/* Date picker placeholders */}
                <span className="hidden text-muted-foreground">From:</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-muted-foreground">To</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <TabsContent value="week">
              <div className="text-sm text-muted-foreground">
                Showing orders for the current week
              </div>
            </TabsContent>
            <TabsContent value="month">
              <div className="text-sm text-muted-foreground">
                Showing orders for the current month
              </div>
            </TabsContent>
            <TabsContent value="year">
              <div className="text-sm text-muted-foreground">
                Showing orders for the current year
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between my-4 gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">क्र.</TableHead>
                  <TableHead className="text-center w-[50px] ">
                    <Button variant="ghost" onClick={() => handleSort("date")}>
                      दिनांक
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center ">दलाल</TableHead>
                  <TableHead className="text-center ">डाग</TableHead>
                  <TableHead className="text-center ">वजन</TableHead>
                  <TableHead className="text-center ">माल</TableHead>
                  <TableHead className="text-center ">शिल्लक</TableHead>
                  <TableHead className="text-center ">
                    <Button variant="ghost" onClick={() => handleSort("paid")}>
                      पेड
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center ">पेड दिनांक</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPattiData.map((order, index) => (
                  <TableRow key={order.entryid}>
                    <TableCell className="text-center ">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="text-center ">
                      {order.date.toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-center ">
                      {order.vendorname}
                    </TableCell>
                    <TableCell className="text-center ">
                      {order.quantity}
                    </TableCell>
                    <TableCell className="text-center ">
                      {order.weight} kg
                    </TableCell>
                    <TableCell className="text-center ">{order.item}</TableCell>
                    <TableCell className="text-center ">
                      ₹{order.payable?.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="justify-center text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold text-center ${
                          order.paid
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.paid ? "Paid" : "Unpaid"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center ">
                      {order.paiddate
                        ? order.paiddate.toLocaleDateString("en-IN")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="ghost"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              Page {currentPage} of {pageCount}
            </div>
            <Button
              variant="ghost"
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
