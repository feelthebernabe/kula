// Temporary debug endpoint — remove after diagnosing env var issue
export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    HF_API_KEY: !!process.env.HF_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
