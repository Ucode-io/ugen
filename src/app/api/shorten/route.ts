import { NextResponse } from "next/server";
import { devUrlStore } from "@/lib/dev-url-store";

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID?.trim();
const EDGE_CONFIG = process.env.EDGE_CONFIG?.trim();
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN?.trim();

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

const MAX_SLUG_LEN = 24;
const MAX_SLUG_WORDS = 4;

function slugify(input: string): string {
  const lower = input.toLowerCase();
  let translit = "";
  for (const ch of lower) translit += TRANSLIT[ch] ?? ch;
  const cleaned = translit.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleaned) return "";
  const words = cleaned.split("-").filter(Boolean).slice(0, MAX_SLUG_WORDS);
  let slug = words.join("-");
  if (slug.length > MAX_SLUG_LEN) {
    const trimmed = slug.slice(0, MAX_SLUG_LEN).replace(/-+[^-]*$/, "");
    slug = trimmed || slug.slice(0, MAX_SLUG_LEN);
  }
  return slug;
}

// FNV-1a 32-bit — deterministic short suffix derived from the long URL.
function shortHash(input: string, len = 4): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36).padStart(len, "0").slice(0, len);
}

function randomHash(len = 6): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0].toString(36).padStart(len, "0").slice(0, len);
}

async function readKey(key: string): Promise<string | null> {
  if (EDGE_CONFIG) {
    try {
      const { get } = await import("@vercel/edge-config");
      const val = await get<string>(key);
      return typeof val === "string" ? val : null;
    } catch (err) {
      console.error("[shorten] Edge Config read failed", err);
      return null;
    }
  }
  return devUrlStore.get(key) ?? null;
}

async function writeKey(key: string, value: string): Promise<boolean> {
  if (EDGE_CONFIG_ID && VERCEL_API_TOKEN) {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ operation: "upsert", key, value }],
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[shorten] Vercel API error", res.status, detail);
    }
    return res.ok;
  }
  devUrlStore.set(key, value);
  return true;
}

// Pick a deterministic, collision-free key.
//  - Prefer the bare slug.
//  - If that slot is taken by a different URL, append `-{shortHash(url)}`.
//  - If the suffixed variant is also taken by a different URL, fall back to a random hash.
async function resolveKey(longUrl: string, slug: string): Promise<string> {
  if (slug) {
    const existing = await readKey(slug);
    if (existing === longUrl) return slug;
    if (existing == null) return slug;

    const suffixed = `${slug}-${shortHash(longUrl)}`;
    const existingSuffixed = await readKey(suffixed);
    if (existingSuffixed === longUrl) return suffixed;
    if (existingSuffixed == null) return suffixed;
  }

  for (let i = 0; i < 4; i++) {
    const candidate = slug ? `${slug}-${randomHash(4)}` : randomHash(6);
    if ((await readKey(candidate)) == null) return candidate;
  }
  return randomHash(8);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const longUrl: unknown = body?.url;
  const aliasInput: unknown = body?.alias;

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

  const slug = typeof aliasInput === "string" ? slugify(aliasInput) : "";
  const key = await resolveKey(longUrl, slug);

  // Skip the write when the key already maps to this URL — idempotent.
  const existing = await readKey(key);
  if (existing !== longUrl) {
    const ok = await writeKey(key, longUrl);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to create link" },
        { status: 500 }
      );
    }
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({ short_url: `${origin}/go/${key}` });
}
