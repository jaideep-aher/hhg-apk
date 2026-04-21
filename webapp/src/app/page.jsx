"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RocketIcon } from "@radix-ui/react-icons";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { farmerExists } from "@/server/dbfunctions";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { set } from "date-fns";
import { FarmerContext } from "@/server/Context";

export default function Component() {
  const { farmerId, setFarmerId } = useContext(FarmerContext);
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));
  const [inputNumber, setInputNumber] = useState("");
  const [disableSearch, setDisableSearch] = useState(false);
  const [alertState, setAlertState] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const router = useRouter();

  useEffect(() => {
    if (farmerId) {
      router.push(`/farmers/${farmerId}`);
    }
  }, [farmerId]);

  const handleSearch = (e) => {
    setDisableSearch(true);
    e.preventDefault();
    if (/^\d{5}$/.test(inputNumber)) {
      setAlertState({
        show: true,
        type: "success",
        message: "वैध आधार क्रमांक. डेटा अस्तित्वात आहे का ते तपासत आहोत...",
      });
      farmerExists(inputNumber)
        .then((exists) => {
          if (exists) {
            localStorage.setItem("farmerId", inputNumber);
            setFarmerId(inputNumber);
            setTimeout(() => {
              router.push(`/farmers/${inputNumber}`);
            }, 400);
          } else {
            setAlertState({
              show: true,
              type: "error",
              message: "शेतकरी आढळला नाही. कृपया वैध आधार क्रमांक टाका.",
            });
            setDisableSearch(false);
          }
        })
        .catch((err) => {
          console.error(err);
          setAlertState({
            show: true,
            type: "error",
            message: "काही चूक झाली आहे. कृपया पुन्हा प्रयत्न करा.",
          });
          setDisableSearch(false);
        });
    } else {
      setAlertState({
        show: true,
        type: "error",
        message: "कृपया वैध ५ अंकी आधार क्रमांक टाका.",
      });
      setDisableSearch(false);
    }
  };

  const notices = [
    {
      title: "AI स्मार्ट मार्केट ट्रेंड्स — मागील २ वर्षांचे विश्लेषण",
      content:
        "आता AI वापरून मागील दोन वर्षांच्या बाजारातील ट्रेंड, सीझनल बदल आणि अंदाज मिळवा. अधिक तपशीलांसाठी 'AI मार्केट ट्रेंड' बघा.",
      color: "bg-purple-100",
    },
    // {
    //   title: "हुंडेकरीच्या शेतकऱ्यांना बियाणे खरेदीवर भव्य सूट!",
    //   content:
    //     "तुमच्या शेतीसाठी दर्जेदार बियाणे थेट उत्पादकाच्या दरात मिळवा. ही ऑफर फक्त हुंडेकारी शेतकऱ्यांसाठी आहे. अधिक माहितीसाठी संपर्क साधा.",
    //   color: "bg-blue-100",
    // },
    {
      title: "2026 वर्षाच्या शुभेच्छा 🎉",
      content:
        "नूतन वर्षाच्या सर्व शेतकरी व व्यापारी बांधवाना हार्दिक शुभेच्छा 🎊",
      color: "bg-green-100",
    },
    // {
    //   title: "दैनिक मार्केट बाजारभाव उपलब्ध",
    //   content:
    //     "आता तुम्ही मालनुसार दररोजचा पुणे, मुंबई आणि इतर मार्केट बाजारभाव ७ दिवसांपर्यंत पाहू शकता.",
    //   color: "bg-orange-100",
    // },
  ];

  return (
    <div className="flex flex-col justify-center bg-background p-4">
      {alertState.show && (
        <Alert
          variant={alertState.type === "success" ? "default" : "destructive"}
          className="mt-4 mb-8"
        >
          <RocketIcon className="h-4 w-4" />
          <AlertTitle>
            {alertState.type === "success" ? "Success!" : "Error!"}
          </AlertTitle>
          <AlertDescription>{alertState.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex-grow flex items-center justify-center mb-8">
        <Card className="w-full max-w-md">
          <form onSubmit={handleSearch}>
            <CardHeader>
              <h2 className="text-2xl font-semibold text-center">
                आपले खाते शोधा
              </h2>
            </CardHeader>
            <CardContent>
              <Input
                name="farmerid"
                type="number"
                placeholder="आधारचे शेवटचे ५ अंक टाका"
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                className="text-lg"
                maxLength={5}
                minLength={5}
                required
                disabled={disableSearch}
                autoComplete="farmerid"
                data-attr="Farmer UID Input"
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={disableSearch}
                data-attr="Farmer UID Search Button"
              >
                Search
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      <div className="flex flex-auto justify-center">
        <Card className="w-full max-w-md mx-auto">
          <h2 className=" p-4 text-2xl font-semibold text-center">
            विशेष सूचना
          </h2>

          <CardContent>
            <Carousel
              plugins={[plugin.current]}
              onMouseEnter={plugin.current.stop}
              onMouseLeave={plugin.current.reset}
              className="w-full"
            >
              <CarouselContent className="">
                {notices.map((notice, index) => (
                  <CarouselItem key={index} className="">
                    <div className={`p-4 rounded-lg ${notice.color} `}>
                      <h3 className="text-lg font-semibold text-center mb-2 text-green-900">
                        {notice.title}
                      </h3>
                      <p className="whitespace-pre-line text-center ">
                        {notice.content}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
              onClick={() => router.push("/dailyrate/agrisight")}
              data-attr="AI Market Trend Button Homescreen"
            >
              <Sparkles className="h-4 w-4 text-white" />
              AI मार्केट ट्रेंड
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* <div className="w-full max-w-md mx-auto">
        <Carousel
          plugins={[plugin.current]}
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          className="w-full"
        >
          <CarouselContent>
            {[...Array(7)].map((_, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-2">
                      <Image
                        src={"/adv-slide/img" + (index + 1) + ".jpg"}
                        width={400}
                        height={400}
                        alt={`Advertisement for Krushitek ${index + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div> */}
    </div>
  );
}
