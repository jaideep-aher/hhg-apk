// create a context
"use client";
import React, { createContext, useState } from "react";
import { useEffect } from "react";

export const FarmerContext = createContext();

export const FarmerProvider = ({ children }) => {
  const [farmerData, setFarmerData] = useState({});
  const [isLogged, setIsLogged] = useState(false);
  const [farmerId, setFarmerId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("farmerId");
    if (token) {
      console.log("token", token);
      setIsLogged(true);
      setFarmerId(token);
      if (
        localStorage.getItem("farmerData2") &&
        JSON.parse(localStorage.getItem("farmerData2")).farmerTableData[0]
          .uid === token
      ) {
        setFarmerData(
          JSON.parse(localStorage.getItem("farmerData2")).farmerTableData[0]
        );
      }
    }
  }, []);

  return (
    <FarmerContext.Provider
      value={{
        farmerData,
        setFarmerData,
        isLogged,
        setIsLogged,
        farmerId,
        setFarmerId,
      }}
    >
      {children}
    </FarmerContext.Provider>
  );
};
