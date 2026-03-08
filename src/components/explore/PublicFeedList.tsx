"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PublicPostCard } from "./PublicPostCard";
import { PostCardSkeleton } from "@/components/shared/Skeletons";
import type { PostWithAuthor } from "@/types/database";

interface PublicFeedListProps {
  initialPosts: PostWithAuthor[];
  category?: string;
  type?: string;
  searchQuery?: string;
}

const PAGE_SIZE = 10;

export function PublicFeedList({
  initialPosts,
  category,
  type,
  searchQuery,
}: PublicFeedListProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= PAGE_SIZE);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(initialPosts);
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

    const params = new URLSearchParams();
    params.set("cursor", lastPost.created_at!);
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (searchQuery) params.set("q", searchQuery);

    const res = await fetch(`/api/browse/posts?${params.toString()}`);
    const { posts: newPosts } = await res.json();

    if ((newPosts ?? []).length < PAGE_SIZE) setHasMore(false);
    setPosts((prev) => [...prev, ...(newPosts ?? [])]);
    setLoading(false);
  }, [loading, hasMore, posts, category, type, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore();
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
        <p className="text-lg font-medium text-muted-foreground">No posts found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try different keywords or remove filters
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {posts.map((post) => (
          <PublicPostCard key={post.id} post={post} />
        ))}
      </div>

      {loading && (
        <div className="mt-6 space-y-6">
          <PostCardSkeleton />
          <PostCardSkeleton />
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
