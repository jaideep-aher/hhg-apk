"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Share2, TrendingUp, MapPin, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSkeleton from "@/components/loading-skeleton";
import CommodityPicker from "@/components/CommodityPicker";
import { fetchCommodities, fetchBestMarkets } from "@/lib/apmcApi";
import { formatPrice, formatAmount } from "@/lib/priceFormat";

/**
 * "तुमच्या मालाला आज कुठे सर्वोत्तम भाव?" —
 * Best APMC for a given crop today, ranked by modal price across all active
 * markets in our Railway APMC DB. Designed as the non-customer acquisition
 * screen: pick your crop → see the top mandi + ₹/quintal delta → share to
 * WhatsApp with one tap.
 *
 * Data source: GET /api/apmc/best?commodity=<slug>&days=1 (Express → Railway).
 * Commodity list: GET /api/apmc/commodities.
 */
export default function BestMarketForCrop() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: commodities = [], isLoading: commoditiesLoading } = useQuery({
    queryKey: ["apmc", "commodities"],
    queryFn: () => fetchCommodities(),
    staleTime: 1000 * 60 * 10,
  });

  const selectedCommodity = searchParams.get("commodity") || "";

  // Default-select the first commodity when the list lands.
  useEffect(() => {
    if (!selectedCommodity && commodities.length) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("commodity", commodities[0].slug);
      router.replace(`/dailyrate/best?${params.toString()}`);
    }
  }, [commodities, selectedCommodity, router, searchParams]);

  const setCommodity = (slug) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("commodity", slug);
    router.push(`/dailyrate/best?${params.toString()}`);
  };

  const {
    data: bestResponse,
    isLoading: bestLoading,
    error: bestError,
  } = useQuery({
    queryKey: ["apmc", "best", selectedCommodity],
    queryFn: () => fetchBestMarkets({ commodity: selectedCommodity, days: 1 }),
    enabled: Boolean(selectedCommodity),
    staleTime: 1000 * 60 * 5,
  });

  const rows = bestResponse?.rows || [];

  const validRows = useMemo(
    () => rows.filter((r) => Number(r.modalPrice) > 0),
    [rows]
  );

  const topRow = validRows[0];
  const bottomRow = validRows[validRows.length - 1];
  const lift =
    topRow && bottomRow && Number(bottomRow.modalPrice) > 0
      ? Math.round(Number(topRow.modalPrice) - Number(bottomRow.modalPrice))
      : 0;

  const selectedCommodityRow = useMemo(
    () => commodities.find((c) => c.slug === selectedCommodity),
    [commodities, selectedCommodity]
  );

  const commodityDisplay = selectedCommodityRow
    ? `${selectedCommodityRow.iconEmoji ? selectedCommodityRow.iconEmoji + " " : ""}${selectedCommodityRow.nameMr}`
    : selectedCommodity;

  const unit = selectedCommodityRow?.unit || "quintal";

  const shareToWhatsApp = () => {
    if (!topRow || !selectedCommodityRow) return;
    const lines = [
      `आज ${selectedCommodityRow.nameMr} चा सर्वात चांगला भाव:`,
      "",
      ...validRows.slice(0, 5).map((r, i) => {
        const f = formatPrice(r.modalPrice, unit, "mr");
        const companion = f.secondary ? ` (${f.secondary})` : "";
        return `${i + 1}. ${r.nameMr} — ${f.primary}${companion}`;
      }),
      "",
      `फरक: ${formatPrice(lift, unit, "mr").primary}`,
      "",
      "स्रोत: HHG Farmers अ‍ॅप",
      "https://hanumanksk.in",
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
  };

  if (commoditiesLoading) return <LoadingSkeleton />;

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            तुमच्या मालाला आज कुठे सर्वोत्तम भाव?
          </CardTitle>
          <CardDescription>
            महाराष्ट्रातील सर्व APMC मार्केटचे आजचे भाव एकाच ठिकाणी.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommodityPicker
            commodities={commodities}
            value={selectedCommodity}
            onChange={setCommodity}
            placeholder="माल निवडा — शोधा, बोला, किंवा भाजी/फळे निवडा"
          />
        </CardContent>
      </Card>

      {bestLoading && <LoadingSkeleton />}

      {bestError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>माहिती मिळाली नाही</AlertTitle>
          <AlertDescription>
            कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.
          </AlertDescription>
        </Alert>
      )}

      {!bestLoading && !bestError && validRows.length === 0 && selectedCommodity && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>आजची माहिती अद्याप आली नाही</AlertTitle>
          <AlertDescription>
            APMC साधारणपणे संध्याकाळी ६ ते ९ दरम्यान भाव पाठवतात. थोड्या वेळाने
            पुन्हा तपासा.
          </AlertDescription>
        </Alert>
      )}

      {topRow && (
        <Card className="border-2 border-green-600">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              सर्वात चांगला भाव — {commodityDisplay}
            </CardDescription>
            <CardTitle className="text-2xl">
              {topRow.nameMr}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const f = formatPrice(topRow.modalPrice, unit, "mr");
              return (
                <>
                  <div className="text-4xl font-bold text-green-700 leading-tight">
                    {f.primary.replace(/\s*\/.*$/, "")}
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      / {unit === "kg" ? "किलो" : unit === "tonne" ? "टन" : "क्विंटल"}
                    </span>
                  </div>
                  {f.secondary && (
                    <div className="text-sm text-muted-foreground">
                      म्हणजेच {f.secondary}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="text-sm text-muted-foreground">
              किमान {formatAmount(topRow.minPrice)} ·
              कमाल {formatAmount(topRow.maxPrice)} ·{" "}
              {new Date(topRow.date).toLocaleDateString("en-IN")}
            </div>
            {lift > 0 && (
              <div className="text-sm bg-green-50 text-green-800 rounded-md p-2">
                इतर मार्केटच्या तुलनेत {formatPrice(lift, unit, "mr").primary} जास्त
                {formatPrice(lift, unit, "mr").secondary && (
                  <> ({formatPrice(lift, unit, "mr").secondary})</>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={shareToWhatsApp}>
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp वर पाठवा
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {validRows.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">सर्व मार्केट तुलना</CardTitle>
            <CardDescription>
              सरासरी भावाप्रमाणे क्रमवारी लावलेली
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {validRows.map((r, idx) => (
              <div
                key={r.marketSlug}
                className="flex items-center justify-between border-b last:border-b-0 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold ${
                      idx === 0
                        ? "bg-green-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {r.nameMr}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatAmount(r.modalPrice)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      /{unit === "kg" ? "किलो" : unit === "tonne" ? "टन" : "क्वि."}
                    </span>
                  </div>
                  {unit === "quintal" && Number(r.modalPrice) > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      ≈ ₹{(Number(r.modalPrice) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} / किलो
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatAmount(r.minPrice)}–{formatAmount(r.maxPrice)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        स्रोत: Agmarknet (data.gov.in) · दर ₹ / क्विंटल (१०० किलो) —
        किलोचा दर हवा असेल तर १०० ने भागा
      </p>
    </div>
  );
}
