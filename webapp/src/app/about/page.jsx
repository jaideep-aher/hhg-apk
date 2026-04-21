"use client";

import {
  Tractor,
  Sprout,
  Loader2,
  Leaf,
  Truck,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllBags } from "@/server/dbfunctions";
import { Skeleton } from "@/components/ui/skeleton";

export default function Component() {
  const queryClient = useQueryClient();
  const {
    data: bags,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bags"],
    queryFn: () => getAllBags(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const refreshData = () => {
    window.location.reload();
  };

  const latitude = 19.31513099932874;
  const longitude = 74.17437496791382;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <main className="flex flex-col items-center justify-center space-y-12">
          <section className="flex flex-col w-full max-w-3xl justify-center">
            <h2 className="text-2xl text-center font-semibold mb-4">
              Our Story{" "}
              {isLoading ? (
                <Skeleton className="h-6 w-16 inline-block" />
              ) : (
                bags?.[0]?.bags
              )}
            </h2>
            <Button className="m-2" onClick={refreshData} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh"
              )}
            </Button>

            <Card>
              <CardContent className="p-6 space-y-4">
                <p>
                  १९६७ पासून, आम्ही एका छोट्या हुंडेकरीपासून सुरुवात केली ज्याने
                  शेतकऱ्यांना त्यांचे उत्पादन बाजारात आणण्यात मदत केली. हुंडेकरी
                  जसजसे लोकप्रिय होत गेले तसतसे आमचे संस्थापक श्री. शिवाजी
                  गंगाधर आहेर यांनी, अभ्यागतांना खते आणि कीटकनाशके विकण्यास
                  सुरुवात केली, जी आता हनुमान कृषी सेवा केंद्र म्हणून ओळखली
                  जाते.
                </p>
                <p>
                  असंख्य संघर्ष होऊनही, हनुमान हुंडेकरी हे घारगाव आणि पठारभाग
                  परिसरात एक महत्त्वाचे नाव आहे आणि शेतकऱ्यांना मदत करण्याचा
                  मोठा इतिहास आहे. कृषी समुदायाला पाठिंबा देण्याची आमची
                  वचनबद्धता गेली अनेक वर्षे अटूट आहे.
                </p>

                <div className="flex justify-center space-x-4 pt-4">
                  <div className="flex items-center">
                    <Tractor className="w-6 h-6 mr-2 text-primary" />
                    <span>1000+ Downloads</span>
                  </div>
                  <div className="flex items-center">
                    <Sprout className="w-6 h-6 mr-2 text-primary" />
                    <span>50+ वर्षांची सेवा</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="w-full max-w-3xl">
            <h2 className="text-2xl font-semibold text-center mb-4">
              आमचे व्यवसाय
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-100">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Leaf className="w-12 h-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    हनुमान कृषी सेवा केंद्र
                  </h3>
                  <p className="mb-4">होलसेल खते, औषधे व बियाणे</p>
                  <p className="text-green-700">Contact: 9890466423</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-100">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Truck className="w-12 h-12 text-yellow-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    हनुमान अर्थमूव्हर्स
                  </h3>
                  <p className="mb-4">JCB सर्व्हिस </p>
                  <p className="text-yellow-700">Contact: 9860081723</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-100">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <ShoppingBag className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    हनुमान हुंडेकरी
                  </h3>
                  <p className="mb-4">
                    कांदा बारदान, धान्य गोण्या, तार, सुतळी व कार्यक्रमांना
                    लागणारे भांडे, टेबल, खुर्च्या इत्यादी.
                  </p>
                  <p className="text-blue-700">Contact: 9890466423</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* <section className="w-full max-w-3xl">
        <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-primary" />
              <p>
                WhatsApp:{" "}
                <a
                  href="https://wa.me/918080386884"
                  className="text-primary hover:underline"
                >
                  8080386884
                </a>
              </p>
            </div>
            {/* <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-primary" />
              <p>
                Email:{" "}
                <a
                  href="mailto:info@hanumanhundekari.com"
                  className="text-primary hover:underline"
                >
                  info@hanumanhundekari.com
                </a>
              </p>
            </div> */}
          {/* <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <p>Hours: Monday - Sunday, 9:00 AM - 9:00 PM</p>
            </div>
            <p className="text-muted-foreground">
              For any issues or inquiries, please contact us via WhatsApp or
              email.
            </p>
          </CardContent>
        </Card>
      </section>  */}

          <section className="w-full max-w-3xl">
            <h2 className="text-2xl text-center font-semibold mb-4">
              Location
            </h2>
            <Card>
              <CardContent className="p-6">
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <iframe
                    width="100%"
                    height="300"
                    src="https://maps.google.com/maps?width=100%25&amp;height=300&amp;hl=en&amp;q=19.31513099932874,%2074.17437496791382+(Hanuman%20Hundekari)&amp;t=&amp;z=18&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
                  ></iframe>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">हनुमान हुंडेकरी</p>
                  <p className="text-muted-foreground mb-4">घारगाव</p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                        "_blank"
                      )
                    }
                  >
                    Get Directions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>

        <footer className="mt-12 py-4 text-center text-muted-foreground">
          <p>
            &copy; Developed by Kuldeep Aher @Agrofix Technologies Pvt. Ltd. All
            rights reserved. 2025
          </p>
        </footer>
      </div>
    </div>
  );
}
