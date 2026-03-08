import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EditPostForm } from "@/components/posts/EditPostForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post) {
    notFound();
  }

  // Only the author can edit
  if (post.author_id !== user.id) {
    redirect(`/posts/${postId}`);
  }

  // Get user's communities for the community selector
  const { data: memberships } = await supabase
    .from("community_members")
    .select("communities(id, name)")
    .eq("user_id", user.id);

  const communities = (memberships ?? [])
    .map(
      (m) =>
        (m as unknown as { communities: { id: string; name: string } })
          .communities
    )
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Edit Post</h1>
      <EditPostForm
        post={post as Record<string, unknown>}
        communities={communities}
      />
    </div>
  );
}
