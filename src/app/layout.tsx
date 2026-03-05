import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "Sec8Deals - Section 8 Deal Intelligence",
    template: "%s | Sec8Deals",
  },
  description:
    "Source, score, and rank Section 8 rental opportunities daily across U.S. markets.",
  openGraph: {
    title: "Sec8Deals - Daily Section 8 Deal Dashboard",
    description: "Find top Section 8 opportunities with A-F viability scoring.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://sec8deals.app",
    siteName: "Sec8Deals",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
