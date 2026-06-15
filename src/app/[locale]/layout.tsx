import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import "@/app/globals.css";
import { siteConfig } from "@/shared/config";
import { routing } from "@/shared/lib/i18n";
import {
  ThemeProvider,
  QueryProvider,
  YandexMetrika,
  GoogleAnalytics,
} from "@/shared/providers";
import { ViewLayoutWrapper } from "@/shared/ui";
import { BillingLimitDialog } from "@/widgets/billing-limit";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const RootLayout = async ({ children, params }: Props) => {
  const { locale } = await params;

  setRequestLocale(locale ?? routing.defaultLocale);

  return (
    <html
      lang={locale ?? routing.defaultLocale}
      className={`${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <YandexMetrika />
        <GoogleAnalytics />
        <QueryProvider>
          <ThemeProvider>
            <NextIntlClientProvider>
              <ViewLayoutWrapper>{children}</ViewLayoutWrapper>
              <BillingLimitDialog />
              <Toaster richColors position="top-right" />
            </NextIntlClientProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;

export const generateStaticParams = () => {
  return routing.locales.map((locale) => ({ locale }));
};
