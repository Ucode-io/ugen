import { NextResponse } from "next/server";

async function tryTinyUrl(url: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ url });
    const res = await fetch(`https://tinyurl.com/api-create.php?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.startsWith("http") ? text : null;
  } catch {
    return null;
  }
}

async function tryIsGd(url: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ format: "simple", url });
    const res = await fetch(`https://is.gd/create.php?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.startsWith("http") ? text : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const short = (await tryTinyUrl(url)) ?? (await tryIsGd(url));
  return NextResponse.json({ short_url: short });
}
