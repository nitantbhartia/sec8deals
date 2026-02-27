import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "PriceMyTask - AI-Powered Home Service Pricing",
    template: "%s | PriceMyTask",
  },
  description:
    "Get instant, accurate price estimates for any home service task. Know what plumbing, electrical, HVAC, painting, and more should cost before you hire. Powered by AI.",
  openGraph: {
    title: "PriceMyTask - Know What It Should Cost",
    description:
      "AI-powered price estimates for plumbing, electrical, HVAC, painting, and more. No sign-up required.",
    url: "https://pricemytask.com",
    siteName: "PriceMyTask",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PriceMyTask - Know What It Should Cost",
    description:
      "Get instant AI-powered price estimates for any home service task.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
