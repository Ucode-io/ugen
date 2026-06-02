import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ApplyPayload = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  services?: string;
  portfolio?: string;
  message?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const row = (label: string, value?: string) => {
  const clean = (value ?? "").trim();
  if (!clean) return "";
  return `<b>${label}:</b> ${escapeHtml(clean)}\n`;
};

export async function POST(req: Request) {
  try {
    const token = process.env.HIRE_EXPERT_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.HIRE_EXPERT_TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json(
        { error: "Telegram credentials are not configured" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as ApplyPayload;

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const text =
      `🧑‍💻 <b>New "Hire an Expert" application</b>\n\n` +
      row("Name", body.name) +
      row("Company", body.company) +
      row("Email", body.email) +
      row("Phone", body.phone) +
      row("Services", body.services) +
      row("Portfolio", body.portfolio) +
      row("Message", body.message);

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("Telegram sendMessage failed:", detail);
      return NextResponse.json(
        { error: "Failed to send application" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Hire expert apply error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}
