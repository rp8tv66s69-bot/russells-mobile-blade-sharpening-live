"use client";

import { Analytics } from "@vercel/analytics/next";

export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const pathname = new URL(event.url).pathname;
        if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
          return null;
        }
        return event;
      }}
    />
  );
}
