import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const q = searchParams.get("q");

  const admin = createAdminClient();

  let query = admin
    .from("posts")
    .select(
      "id, title, body, images, type, category, subcategory, exchange_modes, status, response_count, location_name, created_at, author_id, community_id"
    )
    .eq("status", "active")
    .is("removed_by_mod", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (category) query = query.eq("category", category);
  if (type) query = query.eq("type", type as "offer" | "request");
  if (q) query = query.ilike("title", `%${q}%`);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Anonymize: strip author identity entirely
  const posts = (data ?? []).map((post) => ({
    ...post,
    author_id: null,
    author: {
      id: null,
      display_name: "Community Member",
      avatar_url: null,
      trust_score: null,
    },
  }));

  return NextResponse.json({ posts });
}
