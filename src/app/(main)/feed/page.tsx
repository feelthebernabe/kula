import { createClient } from "@/lib/supabase/server";
import { FeedViewManager } from "@/components/feed/FeedViewManager";
import type { Metadata } from "next";
import type { PostWithAuthor } from "@/types/database";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let posts: PostWithAuthor[] = [];

  if (params.q) {
    // Use search RPC
    const { data } = await supabase.rpc("search_posts", {
      search_query: params.q,
      filter_category: params.category ?? undefined,
      filter_type: params.type ?? undefined,
      result_limit: 10,
    });

    if (data) {
      posts = data.map((row: Record<string, unknown>) => ({
        ...row,
        author: {
          id: row.author_id,
          display_name: row.author_display_name,
          avatar_url: row.author_avatar_url,
          trust_score: row.author_trust_score,
        },
        community: row.community_name
          ? { id: row.community_id, name: row.community_name }
          : null,
      })) as unknown as PostWithAuthor[];
    }
  } else {
    // Standard query
    let query = supabase
      .from("posts")
      .select(
        `
        *,
        author:profiles!author_id(id, display_name, avatar_url, trust_score),
        community:communities!community_id(id, name)
      `
      )
      .eq("status", "active")
      .is("removed_by_mod", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (params.category) {
      query = query.eq("category", params.category);
    }
    if (params.type) {
      query = query.eq("type", params.type as "offer" | "request");
    }

    const { data } = await query;
    posts = (data ?? []) as unknown as PostWithAuthor[];
  }

  return (
    <FeedViewManager
      currentCategory={params.category}
      currentType={params.type}
      currentQuery={params.q}
      initialPosts={posts}
      userId={!params.q ? user?.id : undefined}
    />
  );
}
