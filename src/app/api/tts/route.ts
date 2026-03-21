import { NextRequest } from "next/server";
import { getGroqClient } from "@/lib/groq";

// In-memory rate limit: 60 requests per 5 min per IP
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < 5 * 60_000
  );
  if (timestamps.length >= 60) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const isWarmup = body?.warmup === true;

  // Groq TTS has no cold-start — warmup can return immediately
  if (isWarmup) {
    return new Response(null, { status: 204 });
  }

  const text = typeof body?.text === "string" ? body.text.slice(0, 4096) : null;
  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: "Missing text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const groq = getGroqClient();
    // canopylabs/orpheus-v1-english: high-quality neural TTS on Groq
    // Requires accepting terms once at: https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english
    const response = await groq.audio.speech.create({
      model: "canopylabs/orpheus-v1-english",
      input: text,
      voice: "hannah", // clear, natural-sounding female voice
      response_format: "wav",
    });

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[tts] Groq TTS error (status=${status ?? "?"}):`, message);
    if (message.includes("terms acceptance")) {
      console.error("[tts] Accept Orpheus terms at: https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english");
    }
    return new Response(JSON.stringify({ error: "TTS failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
