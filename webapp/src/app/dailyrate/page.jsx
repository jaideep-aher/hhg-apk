"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MarketRatesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-center bg-background p-4 space-y-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-center mb-4">
            हनुमान हुंडेकरी भाव पहा
          </h2>
          <p className="text-center text-sm text-gray-600 mb-4">
            मुंबई दलाल प्रमाणे भाव
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full primary"
            onClick={() => router.push("/dailyrate/hundekari")}
            data-attr="Daily Market Rate Button Hundekari"
          >
            हुंडेकरी भाव पहा
          </Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-md mx-auto border-2 border-green-600">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-center mb-4">
            तुमच्या मालाला सर्वोत्तम भाव कुठे?
          </h2>
          <p className="text-center text-sm text-gray-600 mb-4">
            महाराष्ट्रातील सर्व APMC मार्केटची तुलना — आजचे सर्वात जास्त भाव
            देणारे मार्केट शोधा.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => router.push("/dailyrate/best")}
            data-attr="Daily Market Rate Button Best"
          >
            सर्वोत्तम भाव शोधा
          </Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-center mb-4">
            इतर मार्केट भाव पहा
          </h2>
          <p className="text-center text-sm text-gray-600 mb-4">
            पुणे, मुंबई आणि इतर मार्केट भाव
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-primary hover:bg-primary-dark"
            onClick={() => router.push("/dailyrate/market")}
            data-attr="Daily Market Rate Button Other"
          >
            इतर मार्केट भाव पहा
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
