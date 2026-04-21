import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ReactQueryCliProvider } from "@/components/ReactQueryCliProvider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import PlausibleProvider from "next-plausible";
import { FarmerProvider } from "@/server/Context";
import { PostHogProvider } from "@/app/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "HHG Farmer Portal",
  description:
    "Portal for farmers to access realtime patti data from Hanuman Hundekari, Ghargaon. Developed by Agrofix Technologies Pvt. Ltd.",
};

export default function RootLayout({ children }) {
  return (
    <ReactQueryCliProvider>
      <html lang="en">
        <head>
          <PlausibleProvider domain="hhgfarmers.vercel.app" />
        </head>
        <body className={inter.className}>
          <FarmerProvider>
            <Header />
            <PostHogProvider>{children}</PostHogProvider>

            <ReactQueryDevtools initialIsOpen={false} />
          </FarmerProvider>
        </body>
      </html>
    </ReactQueryCliProvider>
  );
}
