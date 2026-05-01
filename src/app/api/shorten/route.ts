import { NextResponse } from "next/server";
import { devUrlStore } from "@/lib/dev-url-store";

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID?.trim();
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN?.trim();

function generateHash(): string {
  return Math.random().toString(36).substring(2, 8);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const longUrl: unknown = body?.url;

  if (typeof longUrl !== "string" || !longUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const parsed = new URL(longUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const hash = generateHash();
  const origin = new URL(req.url).origin;

  if (EDGE_CONFIG_ID && VERCEL_API_TOKEN) {
    const vercelRes = await fetch(
      `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ operation: "upsert", key: hash, value: longUrl }],
        }),
      }
    );

    if (!vercelRes.ok) {
      const detail = await vercelRes.text().catch(() => "");
      console.error("[shorten] Vercel API error", vercelRes.status, detail);
      return NextResponse.json(
        { error: "Failed to create link", status: vercelRes.status, detail },
        { status: 500 }
      );
    }

    return NextResponse.json({ short_url: `${origin}/go/${hash}` });
  }

  // Local dev fallback
  devUrlStore.set(hash, longUrl);
  console.log(`[shorten:dev] ${origin}/go/${hash} → ${longUrl}`);
  return NextResponse.json({ short_url: `${origin}/go/${hash}` });
}
