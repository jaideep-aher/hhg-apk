"use client";
import { useState, useEffect } from "react";
import posthog from "posthog-js";
import {
  getFarmerDataUsingId,
  getNotificationsForFarmers,
} from "@/server/dbfunctions";
import { useQuery } from "@tanstack/react-query";
import LoadingSkeleton from "@/components/loading-skeleton";
import { Spinner } from "@/components/ui/spinner";
import WhatsAppMessagesCard from "@/components/whatsapp-messages-card";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
  AlertCircle,
  Sparkles,
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
import { useRouter } from "next/navigation";

export default function ClientComponent({ params: { farmerID } }) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date("2024-04-01").toISOString().split("T")[0],
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState({
    key: "date",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [farmerActivityStatus, setFarmerActivityStatus] = useState("ACTIVE");

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ["farmerData", farmerID[0], startDate, endDate, page, limit],
    queryFn: () =>
      getFarmerDataUsingId(farmerID[0], startDate, endDate, page, limit),
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 2, // Add retry logic
  });

  const {
    data: whatsappNotification,
    error: whatsappNotificationError,
    isLoading: isLoadingWhatsApp,
    isFetching: isFetchingWhatsApp,
  } = useQuery({
    queryKey: ["whatsappNotifications"],
    queryFn: () => getNotificationsForFarmers(),
    refetchOnWindowFocus: false,
    staleTime: 600000,
  });

  useEffect(() => {
    setFarmerActivityStatus(
      data?.farmerTableData?.[0]?.status?.toUpperCase() || "ACTIVE",
    );
  }, [data]);

  useEffect(() => {
    if (!data?.farmerTableData?.[0] || !navigator?.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        posthog.capture("farmer_location_captured", {
          farmerId: farmerID[0],
          farmerName: data.farmerTableData[0]?.farmername || null,
          farmerAddress: data.farmerTableData[0]?.farmeraddress || null,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "farmer_detail_page",
        });
      },
      (error) => {
        posthog.capture("farmer_location_error", {
          farmerId: farmerID[0],
          error: error.message,
          code: error.code,
          source: "farmer_detail_page",
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000,
      },
    );
  }, [data, farmerID]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(data?.totalCount / limit)) {
      setPage(newPage);
    }
  };

  const handleSort = (key) => {
    if (key !== "date" && key !== "payable") return;
    setSorting({
      key,
      direction:
        sorting.key === key && sorting.direction === "asc" ? "desc" : "asc",
    });
  };

  const getSortedData = (data) => {
    if (!data?.farmerData) return [];
    const sortedData = [...data.farmerData].sort((a, b) => {
      if (sorting.key === "date") {
        return sorting.direction === "asc"
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      if (sorting.key === "payable") {
        return sorting.direction === "asc"
          ? Number(a.payable) - Number(b.payable)
          : Number(b.payable) - Number(a.payable);
      }
      return 0;
    });

    return sortedData.filter(
      (item) =>
        item.vendorname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const calculateTotals = (data) => {
    if (!data?.farmerData)
      return { totalPayable: 0, totalQuantity: 0, totalWeight: 0 };
    return data.farmerData.reduce(
      (acc, curr) => ({
        totalPayable: acc.totalPayable + (Number(curr.payable) || 0),
        totalQuantity: acc.totalQuantity + (Number(curr.quantity) || 0),
        totalWeight: acc.totalWeight + (Number(curr.weight) || 0),
      }),
      { totalPayable: 0, totalQuantity: 0, totalWeight: 0 },
    );
  };

  if (isLoading) return <LoadingSkeleton />;

  if (!data) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">कोणताही डेटा सापडला नाही</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => router.back()}
            >
              मागे जा
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(data.totalCount / limit);
  const sortedData = getSortedData(data);
  const totals = calculateTotals(data);

  return (
    <div className="container mx-auto p-2 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {data?.farmerTableData[0]?.farmername}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-muted-foreground">
            <p>आधार नं : {farmerID[0]}</p>
            <p>मोबाईल नं : {data?.farmerTableData[0]?.mobilenumber}</p>
            <p>पत्ता : {data?.farmerTableData[0]?.farmeraddress}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!data?.farmerTableData[0]?.mobilenumber && (
            <div className="flex items-center gap-2 text-primary">
              <Info className="w-4 h-4" />
              <span className="text-sm">
                मोबाईल नं अपडेट करण्यासाठी HHG व्यवस्थापकाशी संपर्क साधा
              </span>
            </div>
          )}
          {!data?.farmerTableData[0]?.farmeraddress && (
            <div className="flex items-center gap-2 text-primary">
              <Info className="w-4 h-4" />
              <span className="text-sm">
                पत्ता अपडेट करण्यासाठी HHG व्यवस्थापकाशी संपर्क साधा
              </span>
            </div>
          )}
        </CardFooter>
      </Card>

      {!isLoadingWhatsApp &&
        !whatsappNotificationError &&
        whatsappNotification?.length > 0 && (
          <div className="mb-6">
            <WhatsAppMessagesCard
              customerType={farmerActivityStatus}
              data={whatsappNotification}
            />
          </div>
        )}

      <Button className="w-full" onClick={() => router.push("/dailyrate")}>
        दैनिक मार्केट भाव
      </Button>
      <Button
        className="w-full bg-purple-500 hover:bg-purple-600"
        onClick={() => router.push(`/dailyrate/agrisight`)}
      >
        <Sparkles className="h-4 w-4 text-white" />
        AI मार्केट ट्रेंड (2024-25)
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>पट्ट्या / नोंदी पहा</CardTitle>
          <CardDescription>
            निवडलेल्या तारखेच्या नोंदी दर्शवत आहे
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="date"
                className="w-auto"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <span className="text-muted-foreground">To</span>
              <Input
                type="date"
                className="w-auto"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="व्यापारी किंवा माला प्रमाणे शोधा .."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { key: "date", label: "दिनांक", sortable: true },
                      { key: "vendorname", label: "दलाल", sortable: false },
                      { key: "quantity", label: "डाग", sortable: false },
                      { key: "weight", label: "वजन", sortable: false },
                      { key: "rate", label: "माल भाव", sortable: false },
                      { key: "payable", label: "शिल्लक", sortable: true },
                    ].map((column) => (
                      <th
                        key={column.key}
                        className={`px-1 py-2 text-center text-sm font-semibold ${
                          column.sortable
                            ? "cursor-pointer hover:bg-gray-100"
                            : ""
                        }`}
                        onClick={() =>
                          column.sortable && handleSort(column.key)
                        }
                      >
                        <div className="flex items-center justify-center gap-1">
                          {column.label}
                          {column.sortable && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isFetching ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <Spinner className="h-10 w-10 mx-auto" />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sortedData.map((order, index) => (
                        <tr key={index} className="hover:bg-gray-50 text-sm">
                          <td className="py-2 px-1 text-center whitespace-nowrap">
                            {new Date(order.date).toLocaleDateString("en-IN", {
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {order.vendorname}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {order.quantity}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {order.weight}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {order.item} {Number(order.rate) / 10}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {order.payable
                              ? Number(order.payable).toLocaleString("en-IN")
                              : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-medium text-sm">
                        <td className="py-2 px-1 text-center">Total</td>
                        <td className="py-2 px-1 text-center">-</td>
                        <td className="py-2 px-1 text-center">
                          {totals.totalQuantity}
                        </td>
                        <td className="py-2 px-1 text-center">
                          {totals.totalWeight}
                        </td>
                        <td className="py-2 px-1 text-center">-</td>
                        <td className="py-2 px-1 text-center">
                          ₹{totals.totalPayable.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
