import { NextRequest } from "next/server";

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

  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "TTS not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const isWarmup = body?.warmup === true;
  const text = isWarmup ? "hello" : (typeof body?.text === "string" ? body.text.slice(0, 4096) : null);

  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: "Missing text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hfFetch = () =>
    fetch("https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

  let res = await hfFetch();

  // HF returns 503 with {"estimated_time": N} while the model is loading.
  // Retry once after a short wait so a cold start doesn't always fall back to native TTS.
  if (res.status === 503) {
    let waitMs = 5000;
    try {
      const errBody = await res.clone().json();
      if (typeof errBody?.estimated_time === "number") {
        waitMs = Math.min(errBody.estimated_time * 1000, 12000);
      }
    } catch { /* ignore parse errors */ }
    await new Promise((r) => setTimeout(r, waitMs));
    res = await hfFetch();
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    console.error("[tts] HF error:", res.status, err);
    return new Response(JSON.stringify({ error: "TTS service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = res.headers.get("content-type") || "audio/flac";

  // For warmup requests the client doesn't need the audio bytes
  if (isWarmup) {
    return new Response(null, { status: 204 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    },
  });
}
