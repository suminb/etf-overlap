import type { Metadata } from "next";
import Script from "next/script";
import I18nProvider from "@/components/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETF Overlap Analysis",
  description: "Compare multiple ETFs and visualize their weighted overlap",
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
