"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RocketIcon } from "@radix-ui/react-icons";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { farmerExists } from "@/server/dbfunctions";

export default function Component() {
  const [inputNumber, setInputNumber] = useState("");
  const [alertState, setAlertState] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const router = useRouter();

  const handleSearch = () => {
    if (/^\d{5}$/.test(inputNumber)) {
      setAlertState({
        show: true,
        type: "success",
        message: "Valid Aadhaar ID. Redirecting...",
      });
      //   check if farmer exists in the database otherwise show error
      farmerExists(inputNumber)
        .then((exists) => {
          if (exists) {
            setTimeout(() => {
              router.push(`/farmers/${inputNumber}`);
            }, 100);
          } else {
            setAlertState({
              show: true,
              type: "error",
              message: "Farmer not found. Please enter a valid Aadhaar ID",
            });
          }
        })
        .catch((err) => {
          console.error(err);
          setAlertState({
            show: true,
            type: "error",
            message: "An error occurred. Please try again later.",
          });
        });
    } else {
      setAlertState({
        show: true,
        type: "error",
        message: "Please enter a valid 5-digit Aadhaar ID",
      });
    }
  };

  return (
    <div className="flex flex-col  justify-center bg-background p-4">
      <div className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-2xl font-semibold">आपले खाते शोधा </h2>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="आधारचे शेवटचे ५ अंक टाका"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              className="text-lg"
              maxLength={5}
              data-attr="Farmer UID Input"
            />
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSearch}
              className="w-full"
              data-attr="Farmer UID Search Button"
            >
              Search
            </Button>
          </CardFooter>
        </Card>
      </div>
      {alertState.show && (
        <Alert
          variant={alertState.type === "success" ? "default" : "destructive"}
          className="mt-4"
        >
          <RocketIcon className="h-4 w-4" />
          <AlertTitle>
            {alertState.type === "success" ? "Success!" : "Error!"}
          </AlertTitle>
          <AlertDescription>{alertState.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
