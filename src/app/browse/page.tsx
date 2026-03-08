import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExploreFilters } from "@/components/explore/ExploreFilters";
import { PublicFeedList } from "@/components/explore/PublicFeedList";
import type { Metadata } from "next";
import type { PostWithAuthor } from "@/types/database";

export const metadata: Metadata = {
  title: "Browse the Community — Kula",
  description:
    "See what your neighbors are sharing, lending, and looking for — no account needed to browse.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("posts")
    .select(
      "id, title, body, images, type, category, subcategory, exchange_modes, status, response_count, location_name, created_at, author_id, community_id"
    )
    .eq("status", "active")
    .is("removed_by_mod", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (params.category) query = query.eq("category", params.category);
  if (params.type) query = query.eq("type", params.type as "offer" | "request");
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  const { data, error } = await query;
  if (error) console.error("[browse] query error:", error.message, error.code, error.details, error.hint);

  // Anonymize author info server-side
  const posts = (data ?? []).map((post) => ({
    ...post,
    community: null,
    author: {
      id: post.author_id,
      display_name: "Community Member",
      avatar_url: null,
      trust_score: null,
    },
  })) as unknown as PostWithAuthor[];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight text-primary">Kula</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            What&apos;s being shared nearby
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real offers and requests from the Kula community. Join to connect with people near you.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <ExploreFilters
            currentCategory={params.category}
            currentType={params.type}
            currentQuery={params.q}
          />
        </div>

        {/* Anon notice */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Member profiles are private.{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>{" "}
            to see who&apos;s sharing and connect with them.
          </span>
        </div>

        {/* Feed */}
        <PublicFeedList
          initialPosts={posts}
          category={params.category}
          type={params.type}
          searchQuery={params.q}
        />
      </main>

      {/* Sticky signup CTA */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Ready to connect?
            </p>
            <p className="text-xs text-muted-foreground">
              Join for free to message members, post your own offers, and start sharing.
            </p>
          </div>
          <Link
            href="/signup"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Join Kula
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
