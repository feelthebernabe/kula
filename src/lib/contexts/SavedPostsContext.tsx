"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useSavedPosts } from "@/lib/hooks/useSavedPosts";

interface SavedPostsContextValue {
  savedIds: Set<string>;
  toggleSave: (postId: string) => Promise<void>;
  loading: boolean;
}

const SavedPostsContext = createContext<SavedPostsContextValue | null>(null);

export function SavedPostsProvider({ children }: { children: ReactNode }) {
  const value = useSavedPosts();
  return (
    <SavedPostsContext.Provider value={value}>
      {children}
    </SavedPostsContext.Provider>
  );
}

export function useSavedPostsContext() {
  const ctx = useContext(SavedPostsContext);
  if (!ctx) {
    // Return a no-op fallback if used outside provider (e.g. server components)
    return { savedIds: new Set<string>(), toggleSave: async () => {}, loading: false };
  }
  return ctx;
}
