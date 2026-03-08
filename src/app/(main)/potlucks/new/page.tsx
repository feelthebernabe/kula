import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CreatePotluckForm } from "@/components/potlucks/CreatePotluckForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan a Potluck" };

export default async function NewPotluckPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const { community: communityId } = await searchParams;

  if (!communityId) redirect("/groups");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify community exists
  const { data: community } = await supabase
    .from("communities")
    .select("id, name")
    .eq("id", communityId)
    .single();

  if (!community) notFound();

  // Verify user is a member
  const { data: membership } = await supabase
    .from("community_members")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect(`/groups/${communityId}`);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Plan a Potluck</h1>
      <CreatePotluckForm
        communityId={community.id}
        communityName={community.name}
      />
    </div>
  );
}
