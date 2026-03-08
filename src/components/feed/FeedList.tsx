"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "./PostCard";
import { PostCardGrid } from "./PostCardGrid";
import { PostCardSkeleton } from "@/components/shared/Skeletons";
import type { PostWithAuthor } from "@/types/database";

export type ViewMode = "list" | "grid";

interface FeedListProps {
  initialPosts: unknown[];
  category?: string;
  type?: string;
  searchQuery?: string;
  viewMode?: ViewMode;
}

const PAGE_SIZE = 10;

function transformRpcResult(row: Record<string, unknown>): PostWithAuthor {
  return {
    ...row,
    author: {
      id: row.author_id as string,
      display_name: row.author_display_name as string,
      avatar_url: row.author_avatar_url as string | null,
      trust_score: row.author_trust_score as number | null,
    },
    community: row.community_name
      ? { id: row.community_id as string, name: row.community_name as string }
      : null,
  } as unknown as PostWithAuthor;
}

export function FeedList({
  initialPosts,
  category,
  type,
  searchQuery,
  viewMode = "list",
}: FeedListProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(
    initialPosts as PostWithAuthor[]
  );
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= PAGE_SIZE);
  const observerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Reset posts when filters or search change
  useEffect(() => {
    setPosts(initialPosts as PostWithAuthor[]);
    setHasMore(initialPosts.length >= PAGE_SIZE);
  }, [initialPosts]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const lastPost = posts[posts.length - 1];
    if (!lastPost) {
      setLoading(false);
      return;
    }

    let newPosts: PostWithAuthor[] = [];

    if (searchQuery) {
      // Use search RPC for pagination
      const { data } = await supabase.rpc("search_posts", {
        search_query: searchQuery,
        filter_category: category ?? undefined,
        filter_type: type ?? undefined,
        result_limit: PAGE_SIZE,
        cursor_created_at: lastPost.created_at ?? undefined,
      });

      newPosts = (data ?? []).map(transformRpcResult);
    } else {
      // Standard query pagination
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
        .lt("created_at", lastPost.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (category) {
        query = query.eq("category", category);
      }
      if (type) {
        query = query.eq("type", type as "offer" | "request");
      }

      const { data } = await query;
      newPosts = (data ?? []) as unknown as PostWithAuthor[];
    }

    if (newPosts.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setPosts((prev) => [...prev, ...newPosts]);
    setLoading(false);
  }, [loading, hasMore, posts, supabase, category, type, searchQuery]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loading, loadMore]);

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {searchQuery ? "No results found" : "No posts yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {searchQuery
            ? "Try different keywords or remove filters"
            : "Be the first to share something with your community!"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {searchQuery && (
        <p className="mb-4 text-sm text-muted-foreground">
          {posts.length} result{posts.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.map((post) => (
            <PostCardGrid key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {loading && (
        <div className={viewMode === "grid" ? "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" : "mt-4 space-y-4"}>
          <PostCardSkeleton />
          <PostCardSkeleton />
          {viewMode === "grid" && <PostCardSkeleton />}
        </div>
      )}

      {hasMore && <div ref={observerRef} className="h-4" />}

      {!hasMore && posts.length > PAGE_SIZE && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end
        </p>
      )}
    </div>
  );
}
