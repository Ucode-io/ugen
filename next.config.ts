import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {},
  },
};

const withNextIntl = createNextIntlPlugin("./src/shared/lib/i18n/request.ts");

export default withNextIntl(nextConfig);
