import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/constants/categories";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Sanitize query: remove characters that could break PostgREST filter syntax
  const sanitized = q.replace(/[\\%_().,"']/g, " ").trim();
  if (!sanitized || sanitized.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  // Use basic ILIKE search on posts (public, no auth required)
  const { data } = await supabase
    .from("posts")
    .select("id, title, category, type, exchange_modes")
    .eq("status", "active")
    .is("removed_by_mod", null)
    .or(`title.ilike.%${sanitized}%,body.ilike.%${sanitized}%`)
    .order("created_at", { ascending: false })
    .limit(3);

  const results = (data ?? []).map((post) => ({
    id: post.id,
    title: post.title,
    type: post.type as "offer" | "request",
    category:
      CATEGORIES.find((c) => c.value === post.category)?.label ??
      post.category,
    exchangeModes: post.exchange_modes as string[],
  }));

  return NextResponse.json({ results });
}
