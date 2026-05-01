import { NextResponse } from "next/server";

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;

function generateHash(): string {
  return Math.random().toString(36).substring(2, 8);
}

export async function POST(req: Request) {
  if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
    return NextResponse.json(
      { error: "Server misconfigured: missing EDGE_CONFIG_ID or VERCEL_API_TOKEN" },
      { status: 500 }
    );
  }

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

  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "create", key: hash, value: longUrl }],
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({ short_url: `${origin}/go/${hash}` });
}
