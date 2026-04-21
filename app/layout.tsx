import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Stripe Account Monitor",
    template: "%s | Stripe Account Monitor",
  },
  description:
    "Early warning dashboard for Stripe account health: decline spikes, chargeback patterns, and payout risk alerts.",
  keywords: [
    "stripe monitoring",
    "payment risk monitoring",
    "chargeback alerts",
    "decline rate monitoring",
    "fintech tools",
  ],
  openGraph: {
    title: "Stripe Account Monitor",
    description:
      "Detect account health degradation before Stripe applies restrictions.",
    type: "website",
    siteName: "Stripe Account Monitor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stripe Account Monitor",
    description:
      "Detect account health degradation before Stripe applies restrictions.",
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
    <html
      lang="en"
      className={`${headingFont.variable} ${monoFont.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
