import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/constants/categories";
import {
  Home,
  Wrench,
  Heart,
  Leaf,
  Baby,
  Palette,
  Car,
  GraduationCap,
  Sofa,
  Briefcase,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreSearch } from "@/components/feed/ExploreSearch";
import { NearYou } from "@/components/feed/NearYou";
import { AskKulaBanner } from "@/components/feed/AskKulaBanner";
import { PostCardGrid } from "@/components/feed/PostCardGrid";
import type { Metadata } from "next";
import type { PostWithAuthor } from "@/types/database";

export const metadata: Metadata = { title: "Explore" };

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Wrench,
  Heart,
  Leaf,
  Baby,
  Palette,
  Car,
  GraduationCap,
  Sofa,
  Briefcase,
};

export default async function ExplorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recentPosts } = await supabase
    .from("posts")
    .select(
      "*, author:profiles!author_id(id, display_name, avatar_url, trust_score)"
    )
    .eq("status", "active")
    .is("removed_by_mod", null)
    .order("created_at", { ascending: false })
    .limit(6);

  // Fetch user's communities for "Your Groups" section
  const { data: memberships } = user
    ? await supabase
        .from("community_members")
        .select("community_id, communities(id, name, member_count)")
        .eq("user_id", user.id)
        .limit(4)
    : { data: [] };

  const communities = (memberships ?? [])
    .map(
      (m) =>
        (m as unknown as { communities: { id: string; name: string; member_count: number } })
          .communities
    )
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Search for what you need or browse by category
        </p>
      </div>

      <ExploreSearch />

      <AskKulaBanner />

      <NearYou />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Categories
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || Home;
            return (
              <Link
                key={cat.value}
                href={`/feed?category=${cat.value}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {recentPosts && recentPosts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Activity
            </h2>
            <Link href="/feed">
              <Button variant="ghost" size="sm">
                See all
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(recentPosts as unknown as PostWithAuthor[]).map((post) => (
              <PostCardGrid key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      {communities.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Your Groups
            </h2>
            <Link href="/groups">
              <Button variant="ghost" size="sm">
                See all
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {communities.map((c) => (
              <Link
                key={c.id}
                href={`/groups/${c.id}`}
                className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground truncate">
                  {c.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.member_count} members
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
