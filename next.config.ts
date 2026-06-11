import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Keep `next dev` and `next build` from writing into the same directory.
  // Running a production build while the workspace is open otherwise replaces
  // `.next/static/development` underneath the dev server and crashes it with
  // ENOENT errors for temporary manifest files.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {},
  async headers() {
    return [
      {
        // 13.5 MB esbuild WASM. По умолчанию Next отдаёт /public с
        // max-age=0, must-revalidate, из-за чего файл ревалидируется/качается
        // каждый сеанс. Кэшируем надолго; смена версии esbuild меняет ?v=…
        // в URL (см. bundler.ts), поэтому стейл не отдаём.
        source: "/esbuild.wasm",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/shared/lib/i18n/request.ts");

export default withNextIntl(nextConfig);
