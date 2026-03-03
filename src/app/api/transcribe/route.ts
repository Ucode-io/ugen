import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: Request) {
  try {
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
