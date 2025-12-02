import type { Metadata } from "next";
import Script from "next/script";
import I18nProvider from "@/components/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "ETF Overlap Analysis - Compare 3+ ETFs Simultaneously | Free Portfolio Overlap Tool",
  description:
    "Free ETF overlap calculator: Compare 3 or more ETFs at once with weighted overlap analysis. Visualize portfolio overlap, shared holdings, and diversification with interactive heatmaps. Supports popular ETFs like SPY, QQQ, VTI, and more.",
  keywords: [
    "ETF overlap",
    "ETF comparison",
    "compare multiple ETFs",
    "compare 3 ETFs",
    "portfolio overlap calculator",
    "ETF holdings overlap",
    "weighted overlap analysis",
    "ETF diversification",
    "multi-ETF comparison",
    "SPY QQQ overlap",
    "ETF portfolio analyzer",
  ],
  authors: [{ name: "ETF Overlap Analysis" }],
  openGraph: {
    title: "ETF Overlap Analysis - Compare 3+ ETFs Simultaneously",
    description:
      "Free tool to compare multiple ETFs at once. Analyze weighted overlap, shared holdings, and portfolio diversification with interactive visualizations.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ETF Overlap Analysis - Compare 3+ ETFs Simultaneously",
    description:
      "Free tool to compare multiple ETFs at once. Analyze weighted overlap and diversification.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const GA_MEASUREMENT_ID = "G-PHV3JS8LLP";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Script id="structured-data" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "ETF Overlap Analysis",
              "applicationCategory": "FinanceApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description": "Free ETF overlap calculator that allows comparing 3 or more ETFs simultaneously. Analyze weighted overlap, shared holdings, and portfolio diversification.",
              "featureList": [
                "Compare 3 or more ETFs at once",
                "Weighted overlap analysis",
                "Interactive heatmap visualization",
                "Core overlap calculation",
                "Shared holdings analysis",
                "Pairwise ETF comparison"
              ],
              "browserRequirements": "Requires JavaScript",
              "operatingSystem": "Any"
            }
          `}
        </Script>
      </head>
      <body>
        <I18nProvider>
          <LanguageSwitcher />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
