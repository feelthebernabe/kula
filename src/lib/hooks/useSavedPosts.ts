"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Loads the current user's saved post IDs into a Set
 * for instant bookmark state checks without per-card queries.
 */
export function useSavedPosts() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id);

      setSavedIds(new Set((data ?? []).map((d) => d.post_id)));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSave = useCallback(
    async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const isSaved = savedIds.has(postId);

      if (isSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase.from("saved_posts").insert({
          user_id: user.id,
          post_id: postId,
        });
        setSavedIds((prev) => new Set(prev).add(postId));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedIds]
  );

  return { savedIds, toggleSave, loading };
}
