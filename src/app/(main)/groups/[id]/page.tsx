import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { JoinGroupButton } from "@/components/community/JoinGroupButton";
import { LeaveGroupButton } from "@/components/community/LeaveGroupButton";
import { Users, MapPin, Plus, MessageSquare, UserPlus, UtensilsCrossed } from "lucide-react";
import { InviteDialog } from "@/components/invites/InviteDialog";
import { PotluckCard } from "@/components/potlucks/PotluckCard";
import { CommunityRulesSection } from "@/components/moderation/CommunityRulesSection";
import { ModPanel } from "@/components/moderation/ModPanel";
import { RoleManageButton } from "@/components/moderation/RoleManageButton";
import { BanBanner } from "@/components/moderation/BanBanner";
import { formatDistanceToNow } from "date-fns";

interface MemberProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  trust_score: number;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  profiles: MemberProfile;
}

interface PostRow {
  id: string;
  title: string;
  type: string;
  category: string;
  created_at: string;
  author: { display_name: string };
}

interface ThreadRow {
  id: string;
  title: string;
  reply_count: number;
  last_reply_at: string;
  author: { display_name: string };
}

interface PotluckRow {
  id: string;
  title: string;
  event_date: string;
  location_name: string | null;
  capacity: number | null;
  rsvp_count: number | null;
  status: string | null;
  host: { display_name: string };
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", id)
    .single();

  if (!community) notFound();

  // Check current user's membership
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = user
    ? await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isMember = !!membership;
  const isAdmin = membership?.role === "admin";
  const isMod = membership?.role === "moderator" || isAdmin;

  const { data: rawMembers } = await supabase
    .from("community_members")
    .select(
      "id, user_id, role, profiles!user_id(id, display_name, avatar_url, trust_score)"
    )
    .eq("community_id", id)
    .order("joined_at", { ascending: true })
    .limit(50);

  const members = (rawMembers ?? []) as unknown as MemberRow[];

  const { data: rawPosts } = await supabase
    .from("posts")
    .select(
      "id, title, type, category, created_at, author:profiles!author_id(display_name)"
    )
    .eq("community_id", id)
    .eq("status", "active")
    .is("removed_by_mod", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentPosts = (rawPosts ?? []) as unknown as PostRow[];

  // Fetch discussion threads for this community
  const { data: rawThreads } = await supabase
    .from("discussion_threads")
    .select(
      "id, title, reply_count, last_reply_at, author:profiles!author_id(display_name)"
    )
    .eq("community_id", id)
    .is("removed_by_mod", null)
    .order("last_reply_at", { ascending: false })
    .limit(5);

  const threads = (rawThreads ?? []) as unknown as ThreadRow[];

  // Fetch upcoming potlucks for this community
  const { data: rawPotlucks } = await supabase
    .from("potlucks")
    .select(
      "id, title, event_date, location_name, capacity, rsvp_count, status, host:profiles!host_id(display_name)"
    )
    .eq("community_id", id)
    .eq("status", "upcoming")
    .order("event_date", { ascending: true })
    .limit(5);

  const potlucks = (rawPotlucks ?? []) as unknown as PotluckRow[];

  return (
    <div className="space-y-6">
      {/* Community Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">
                {community.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {community.member_count} members
                </span>
                <Badge variant="outline" className="capitalize">
                  {community.type}
                </Badge>
                {community.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {community.location}
                  </span>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {isMember ? (
                <>
                  <Link href={`/posts/new?community=${id}`}>
                    <Button size="sm">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Post
                    </Button>
                  </Link>
                  <LeaveGroupButton
                    communityId={id}
                    communityName={community.name}
                  />
                </>
              ) : (
                <JoinGroupButton communityId={id} />
              )}
            </div>
          </div>
          {community.description && (
            <p className="mt-4 text-sm text-muted-foreground">
              {community.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ban Banner */}
      {user && <BanBanner communityId={id} userId={user.id} />}

      {/* Community Rules */}
      <Card>
        <CardContent className="pt-4">
          <CommunityRulesSection
            communityId={id}
            rules={(community.rules as string[]) ?? []}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>

      {/* Mod Panel */}
      {isMod && user && (
        <Card>
          <CardContent className="pt-4">
            <ModPanel communityId={id} currentUserId={user.id} />
          </CardContent>
        </Card>
      )}

      {/* Recent Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length > 0 ? (
            <div className="space-y-2">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {post.type === "offer" ? "Offering" : "Looking for"}{" "}
                    &middot; {post.author?.display_name}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No posts yet.{" "}
              {isMember && "Be the first to share something!"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Discussions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Discussions</CardTitle>
            {isMember && (
              <Link href={`/discuss/new?community=${id}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  New Thread
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {threads.length > 0 ? (
            <div className="space-y-2">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/discuss/${thread.id}`}
                  className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {thread.title}
                    </p>
                    <Badge variant="outline" className="shrink-0 gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {thread.reply_count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {thread.author?.display_name} &middot;{" "}
                    {thread.last_reply_at &&
                      formatDistanceToNow(new Date(thread.last_reply_at), {
                        addSuffix: true,
                      })}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No discussions yet.{" "}
              {isMember && "Start a conversation!"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Potlucks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Potlucks</CardTitle>
            {isMember && (
              <Link href={`/potlucks/new?community=${id}`}>
                <Button size="sm" variant="outline">
                  <UtensilsCrossed className="mr-1.5 h-4 w-4" />
                  Plan a Potluck
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {potlucks.length > 0 ? (
            <div className="space-y-2">
              {potlucks.map((potluck) => (
                <PotluckCard key={potluck.id} potluck={potluck} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming potlucks.{" "}
              {isMember && "Plan the first one!"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Members ({community.member_count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const profile = member.profiles;
              if (!profile) return null;
              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <Link
                    href={`/profile/${member.user_id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {profile.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {profile.display_name}
                      </p>
                      <TrustScoreBadge score={profile.trust_score} size="sm" />
                    </div>
                  </Link>
                  {member.role === "moderator" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Mod
                    </Badge>
                  )}
                  {member.role === "admin" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Admin
                    </Badge>
                  )}
                  {isAdmin && user && (
                    <RoleManageButton
                      communityId={id}
                      memberId={member.id}
                      memberUserId={member.user_id}
                      memberName={profile.display_name}
                      currentRole={member.role}
                      currentUserId={user.id}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite CTA */}
      {isMember && user && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Grow your community
              </p>
              <p className="text-xs text-muted-foreground">
                Invite trusted neighbors to join Kula
              </p>
            </div>
            <InviteDialog userId={user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
