import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Calendar, Clock, Leaf, Package } from "lucide-react";

export default function SeedCard({ seed }) {
  const discountPercentage = Math.round(
    ((seed.originalPrice - seed.price) / seed.originalPrice) * 100
  );

  return (
    <Card className="overflow-hidden relative group transition-all duration-300 hover:shadow-lg">
      <div className="absolute top-2 left-2 z-10">
        <Badge className="bg-green-600 text-white font-semibold">
          {discountPercentage}% सूट
        </Badge>
      </div>
      <div className="relative w-full h-56 overflow-hidden">
        <Image
          src={seed.image || "/placeholder.svg"}
          alt={seed.title}
          layout="fill"
          objectFit="contain"
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-green-800">
          {seed.title}
        </CardTitle>
        <p className="text-sm text-gray-600">{seed.mfg}</p>
      </CardHeader>
      <CardContent>
        {/* <p className="text-sm text-gray-700 mb-4">{seed.description}</p> */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center text-sm">
            <Leaf className="w-4 h-4 mr-2 text-green-600" />
            <span>{seed.type}</span>
          </div>
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 mr-2 text-green-600" />
            <span>{seed.season}</span>
          </div>
          <div className="flex items-center text-sm">
            <Clock className="w-4 h-4 mr-2 text-green-600" />
            <span>{seed.maturityPeriod}</span>
          </div>
          <div className="flex items-center text-sm">
            <Package className="w-4 h-4 mr-2 text-green-600" />
            <span>500 ग्रा</span>
          </div>
        </div>
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-gray-500 line-through text-sm">
              मूळ किंमत: ₹{seed.originalPrice.toFixed(2)}
            </p>
            <p className="text-green-700 font-bold text-xl">
              ₹{seed.price.toFixed(2)}
            </p>
          </div>
          <Badge className="bg-yellow-500 text-black">
            हुंडेकरी शेतकऱ्यांसाठी विशेष ऑफर
          </Badge>
        </div>
        {/* <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
          कार्टमध्ये जोडा
        </Button> */}
      </CardContent>
    </Card>
  );
}
