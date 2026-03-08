"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";

export function BookmarkButton({
  isSaved,
  onToggle,
}: {
  isSaved: boolean;
  onToggle: () => void;
}) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  }

  return (
    <button
      onClick={handleClick}
      className={`rounded-md p-1 transition-colors ${
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
