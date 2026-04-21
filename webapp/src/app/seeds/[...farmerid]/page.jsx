"use client";

import { useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FarmerContext } from "@/server/Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import SeedCard from "./SeedCard";
import { seedData } from "./SeedData";

export default function SeedProductsPage({ params: { farmerid } }) {
  const { farmerData } = useContext(FarmerContext);
  const [isLogged, setIsLogged] = useState(false);

  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("सर्व");

  useEffect(() => {
    const token = localStorage.getItem("farmerId");
    console.log("token dadfaf", token);
    if (!token) {
      router.push("/");
    }
  }, []);

  const filteredSeeds = seedData.filter(
    (seed) =>
      (selectedType === "सर्व" || seed.type === selectedType) &&
      (seed.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seed.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const seedTypes = ["सर्व", "गवार", "चवळी", "फरशी"];

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="bg-gradient-to-r from-green-500 to-green-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            हुंडेकरी शेतकऱ्यांसाठी विशेष सवलत
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            फक्त मर्यादित कालावधीसाठी! सर्व बियाण्यांवर 20% ते 40% सूट.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {seedTypes.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="बियाणे शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredSeeds.map((seed) => (
          <SeedCard key={seed.id} seed={seed} />
        ))}
      </div>
    </div>
  );
}
