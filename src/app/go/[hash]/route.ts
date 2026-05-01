import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID?.trim();
const EDGE_CONFIG = process.env.EDGE_CONFIG?.trim();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  if (EDGE_CONFIG_ID && EDGE_CONFIG) {
    const { get } = await import("@vercel/edge-config");
    const longUrl = await get<string>(hash);
    if (longUrl) return NextResponse.redirect(new URL(longUrl));
  } else {
    const { devUrlStore } = await import("@/lib/dev-url-store");
    const longUrl = devUrlStore.get(hash);
    if (longUrl) return NextResponse.redirect(new URL(longUrl));
  }

  return NextResponse.redirect(new URL("/", _req.url));
}
