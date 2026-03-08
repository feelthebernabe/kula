import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron - runs daily at 10am UTC
// Reveals blind reviews whose 7-day window has expired

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Call the reveal_expired_reviews RPC function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("reveal_expired_reviews");

  if (error) {
    return NextResponse.json(
      { error: "Failed to reveal reviews: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    revealed: data ?? 0,
    message: `Revealed ${data ?? 0} expired blind review(s)`,
  });
}
