import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Short links come back from the BE as `https://<our-frontend-host>/p/<hash>`.
// This route just hands the hash off to the backend, which holds the slug→URL
// mapping and issues the final 301 to the real microfrontend URL.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://api.admin.u-code.io";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  return NextResponse.redirect(`${API_BASE_URL}/p/${encodeURIComponent(hash)}`);
}
