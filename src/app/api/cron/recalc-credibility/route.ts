import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron - runs weekly on Sunday at 3am UTC
// Recalculates reviewer credibility coefficients for all reviewers

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Call the batch recalculation RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("recalculate_all_reviewer_credibility");

  if (error) {
    return NextResponse.json(
      { error: "Failed to recalculate credibility: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Reviewer credibility recalculated for all reviewers",
  });
}
