import { CreatePostForm } from "@/components/posts/CreatePostForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's communities for the post form
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id, communities(id, name)")
    .eq("user_id", user.id);

  const communities = (memberships ?? [])
    .map((m) => (m as unknown as { communities: { id: string; name: string } }).communities)
    .filter(Boolean);

  // Check pending reviews for anti-gaming enforcement
  const { data: profile } = await supabase
    .from("profiles")
    .select("pending_reviews")
    .eq("id", user.id)
    .single();
  const pendingReviews = profile?.pending_reviews ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Post</h1>
        <p className="text-sm text-muted-foreground">
          Share something with your community or ask for what you need
        </p>
      </div>
      <CreatePostForm
        communities={communities}
        defaultCommunityId={params.community}
        pendingReviews={pendingReviews}
      />
    </div>
  );
}
