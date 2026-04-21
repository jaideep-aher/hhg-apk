"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  Package,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllAds } from "@/server/dbfunctions";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const statusColors = {
  Active: "bg-green-100 text-green-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Fulfilled: "bg-blue-100 text-blue-800",
  Cancelled: "bg-red-100 text-red-800",
};

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="p-3">
            <Skeleton className="h-6 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdvertisementList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("askingprice");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilter] = useState("all");

  const { data: ads = [], isLoading, error } = useQuery({
    queryKey: ["ads"],
    queryFn: () => getAllAds(),
    staleTime: 1000 * 60 * 60 * 24,
  });

  const filteredAndSortedAds = ads
    .filter((ad) => {
      const matchesSearch =
        ad.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.vyapariname.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || ad.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortBy] > b[sortBy]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  if (error)
    return (
      <div className="rounded-lg bg-red-100 p-4 text-red-700">
        <h3 className="font-bold">जाहिराती मिळवता आल्या नाहीत</h3>
        <p className="text-sm">कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.</p>
      </div>
    );

  return (
    <div className="container mx-auto px-2 py-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2 text-center">
          उपलब्ध जाहिराती
        </h1>
        <div className="flex items-center space-x-1 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs sm:text-sm">
          <Info className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-700">
            सर्व जाहिराती HHG द्वारे प्रमाणित आहेत
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-10 text-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[100px] h-10">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="askingprice">भाव</SelectItem>
            <SelectItem value="requireddate">दिनांक</SelectItem>
            <SelectItem value="requiredweight">वजन</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() =>
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
          }
        >
          {sortOrder === "asc" ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedAds.map((ad, index) => (
            <motion.div
              key={ad.advid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="p-3 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl font-bold leading-tight">
                      {ad.item}
                    </CardTitle>
                    <Badge
                      className={`${statusColors[ad.status]} text-xs whitespace-nowrap`}
                    >
                      {ad.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <UserCheck className="w-4 h-4 mr-1" />
                    <span className="truncate">{ad.vyapariname}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Package className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>{Number(ad.requiredweight)} Kg</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {new Date(ad.requireddate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                  {ad.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 my-2">
                      {ad.description}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      ₹{Number(ad.askingprice)}
                    </span>
                    <span className="text-sm text-gray-500">per Kg</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
