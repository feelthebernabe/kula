import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/ui/empty-state";
import { SavedPostsProvider } from "@/lib/contexts/SavedPostsContext";
import type { Metadata } from "next";
import type { PostWithAuthor } from "@/types/database";

export const metadata: Metadata = { title: "Saved Posts" };

export default async function SavedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: savedRows } = await supabase
    .from("saved_posts")
    .select(
      `
      post_id,
      created_at,
      post:posts!post_id(
        *,
        author:profiles!author_id(id, display_name, avatar_url, trust_score),
        community:communities!community_id(id, name)
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const posts = (savedRows ?? [])
    .map((row) => (row as unknown as { post: PostWithAuthor }).post)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saved</h1>
        <p className="text-sm text-muted-foreground">
          Posts you&apos;ve bookmarked for later
        </p>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          heading="No saved posts yet"
          description="Tap the bookmark icon on any post to save it for later."
          actionLabel="Browse feed"
          actionHref="/feed"
        />
      ) : (
        <SavedPostsProvider>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </SavedPostsProvider>
      )}
    </div>
  );
}
