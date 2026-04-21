import { Inter } from "next/font/google";
import { headers } from "next/headers";
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

/**
 * The Android app injects "hhg-android/<versionCode>" into its WebView's
 * User-Agent (see WebViewScreen.kt). When we detect that UA we suppress the
 * web `<Header />` because the native Kotlin shell already provides the top
 * bar, hamburger drawer and page navigation — rendering our own header on
 * top would double-stack navigation and consume vertical space on a phone.
 *
 * Regular browser visitors (no hhg-android in UA) still see the full header.
 */
function isInsideAndroidShell() {
  try {
    const ua = headers().get("user-agent") || "";
    return ua.includes("hhg-android");
  } catch (_) {
    // headers() only works in a request context — during static pre-render
    // we assume browser and show the header.
    return false;
  }
}

export default function RootLayout({ children }) {
  const insideApp = isInsideAndroidShell();
  return (
    <ReactQueryCliProvider>
      <html lang="en">
        <head>
          <PlausibleProvider domain="hhgfarmers.vercel.app" />
        </head>
        <body className={inter.className}>
          <FarmerProvider>
            {!insideApp && <Header />}
            <PostHogProvider>{children}</PostHogProvider>

            <ReactQueryDevtools initialIsOpen={false} />
          </FarmerProvider>
        </body>
      </html>
    </ReactQueryCliProvider>
  );
}
