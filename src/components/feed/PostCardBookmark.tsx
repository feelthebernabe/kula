"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSavedPostsContext } from "@/lib/contexts/SavedPostsContext";

export function PostCardBookmark({ postId }: { postId: string }) {
  const { savedIds, toggleSave } = useSavedPostsContext();
  const isSaved = savedIds.has(postId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleSave(postId);
  }

  return (
    <button
      onClick={handleClick}
      className={`shrink-0 rounded-md p-1 transition-colors ${
        isSaved
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
      title={isSaved ? "Remove from saved" : "Save for later"}
      aria-label={isSaved ? "Remove from saved" : "Save for later"}
    >
      {isSaved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </button>
  );
}
