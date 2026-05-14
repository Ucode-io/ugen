import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const client = new ElevenLabsClient({ apiKey });

    const formData = await req.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const transcription = await client.speechToText.convert({
      file: file,
      modelId: "scribe_v1",
      tagAudioEvents: false,
      diarize: false,
    });

    return NextResponse.json(transcription);
  } catch (error) {
    console.error("STT Error:", error);
    return NextResponse.json({ error: "Failed to transcribe" }, { status: 500 });
  }
}
