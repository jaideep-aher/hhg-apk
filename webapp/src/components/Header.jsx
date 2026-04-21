"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import {
  CircleUser,
  Menu,
  Sprout,
  Home,
  ShoppingBag,
  Map,
  Info,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FarmerContext } from "@/server/Context";

export function Header() {
  const {
    farmerId,
    setFarmerId,
    farmerData,
    setFarmerData,
    isLogged,
    setIsLogged,
  } = useContext(FarmerContext);
  const [currentSelected, setCurrentSelected] = useState("home");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const version_text = "Version: 2.3.2 (Release)";

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dailyrate", label: "Market Rate", icon: ShoppingBag },
    { href: "/dailyrate/agrisight", label: "AI Market Trend", icon: Sparkles },
    ...(farmerId
      ? [{ href: `/seeds/${farmerId}`, label: "Seeds", icon: Sparkles }]
      : []),
    { href: "/localvyapar", label: "Local Vyapari", icon: Map },
    { href: "/about", label: "About", icon: Info },
  ];

  const handleLogout = () => {
    localStorage.removeItem("farmerId");
    localStorage.removeItem("farmerData2");
    setIsLogged(false);
    setFarmerId("");
    setFarmerData({});
    window.location.href = "/";
  };

  const handleNavClick = (label) => {
    setCurrentSelected(label.toLowerCase());
    setIsSheetOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-2 md:container md:max-w-screen-2xl">
        <div className="flex w-full justify-between items-center">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-4">
                  <Sprout className="h-5 w-5 text-orange-500" />
                  <span className="font-semibold text-lg">हनुमान हुंडेकरी</span>
                </div>
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 text-lg px-2 py-1 rounded-md transition-colors ${
                      currentSelected === label.toLowerCase()
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                    onClick={() => handleNavClick(label)}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                ))}
                <div className="flex-1" />
                <div className="border-t pt-4 text-center">
                  <span className="text-xs text-muted-foreground">
                    {version_text}
                  </span>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Link href="/" className="flex items-center">
              <span className="font-mono text-2xl text-orange-500 font-extrabold">
                हनुमान हुंडेकरी
              </span>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="relative rounded-full "
              >
                <CircleUser className="h-5 w-5" />
                {isLogged && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {farmerData?.farmerid ? (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {farmerData.farmername}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        ID: {farmerId}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    Log out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem disabled>
                    Waiting for data...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 transition-colors hover:text-foreground ${
                currentSelected === label.toLowerCase()
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
              onClick={() => setCurrentSelected(label.toLowerCase())}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
