"use client";

import { useState, useEffect } from "react";
import { FeedFilters } from "./FeedFilters";
import { FeedList, type ViewMode } from "./FeedList";
import { SavedPostsProvider } from "@/lib/contexts/SavedPostsContext";
import type { PostWithAuthor } from "@/types/database";

const STORAGE_KEY = "kula-feed-view-mode";

export function FeedViewManager({
  currentCategory,
  currentType,
  currentQuery,
  initialPosts,
  userId,
}: {
  currentCategory?: string;
  currentType?: string;
  currentQuery?: string;
  initialPosts: PostWithAuthor[];
  userId?: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") {
      setViewMode(stored);
    }
  }, []);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  return (
    <SavedPostsProvider>
      <FeedFilters
        currentCategory={currentCategory}
        currentType={currentType}
        currentQuery={currentQuery}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <FeedList
        initialPosts={initialPosts}
        category={currentCategory}
        type={currentType}
        searchQuery={currentQuery}
        viewMode={viewMode}
        userId={userId}
      />
    </SavedPostsProvider>
  );
}
