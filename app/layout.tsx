import type { Metadata } from "next";
import SiteAnalytics from "@/components/SiteAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Russell's Mobile Blade Sharpening",
  description: "Veteran-owned mobile mower and bush hog blade sharpening serving Washington, St. Tammany, and Tangipahoa Parishes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
