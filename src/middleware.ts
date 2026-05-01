import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { get } from "@vercel/edge-config";
import { routing } from "./shared/lib/i18n";
import createMiddleware from "next-intl/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/go/")) {
    const hash = path.split("/").pop();
    const longUrl = await get<string>(hash || "");
    if (longUrl) {
      return NextResponse.redirect(new URL(longUrl));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
