import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Russell's Mobile Blade Sharpening",
  description: "Professional mobile mower and bush hog blade sharpening in Covington, Mandeville, and Madisonville.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
