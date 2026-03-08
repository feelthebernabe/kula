import { createClient } from "@/lib/supabase/server";
import { GroupsTabs } from "@/components/community/GroupsTabs";
import { CreateGroupDialog } from "@/components/community/CreateGroupDialog";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Groups" };

interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  type: string;
  location: string | null;
}

export default async function GroupsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // User's communities
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id, communities(*)")
    .eq("user_id", user.id);

  const myGroups = (memberships ?? [])
    .map((m) => (m as unknown as { communities: CommunityRow }).communities)
    .filter(Boolean);

  // All communities for discovery
  const { data: allCommunities } = await supabase
    .from("communities")
    .select("id, name, description, member_count, type, location")
    .order("member_count", { ascending: false });

  const myGroupIds = new Set(myGroups.map((c) => c.id));
  const discoverGroups = ((allCommunities ?? []) as CommunityRow[]).filter(
    (c) => !myGroupIds.has(c.id)
  );

  // Get current user trust score for group creation gate
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();
  const userTrustScore = currentProfile?.trust_score ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Groups</h1>
          <p className="text-sm text-muted-foreground">
            Your communities and local groups
          </p>
        </div>
        <CreateGroupDialog currentUserTrustScore={userTrustScore} />
      </div>

      <GroupsTabs myGroups={myGroups} discoverGroups={discoverGroups} />
    </div>
  );
}
