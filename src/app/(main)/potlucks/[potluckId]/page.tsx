import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PotluckDetail } from "@/components/potlucks/PotluckDetail";
import type { Metadata } from "next";
import type {
  PotluckWithHost,
  PotluckDishSlotWithClaimer,
  PotluckRsvpWithProfile,
  PotluckCommentWithAuthor,
} from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ potluckId: string }>;
}): Promise<Metadata> {
  const { potluckId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("potlucks")
    .select("title")
    .eq("id", potluckId)
    .single();
  return { title: data?.title || "Potluck" };
}

export default async function PotluckDetailPage({
  params,
}: {
  params: Promise<{ potluckId: string }>;
}) {
  const { potluckId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch potluck with host + community
  const { data: rawPotluck } = await supabase
    .from("potlucks")
    .select(
      "*, host:profiles!host_id(id, display_name, avatar_url, trust_score), community:communities!community_id(id, name)"
    )
    .eq("id", potluckId)
    .single();

  if (!rawPotluck) notFound();

  const potluck = rawPotluck as unknown as PotluckWithHost;

  // Fetch dish slots with claimers
  const { data: rawSlots } = await supabase
    .from("potluck_dish_slots")
    .select(
      "*, claimer:profiles!claimed_by(id, display_name, avatar_url)"
    )
    .eq("potluck_id", potluckId)
    .order("category");

  const dishSlots = (rawSlots ?? []) as unknown as PotluckDishSlotWithClaimer[];

  // Fetch RSVPs with profiles
  const { data: rawRsvps } = await supabase
    .from("potluck_rsvps")
    .select(
      "*, profile:profiles!user_id(id, display_name, avatar_url, trust_score)"
    )
    .eq("potluck_id", potluckId)
    .order("created_at");

  const rsvps = (rawRsvps ?? []) as unknown as PotluckRsvpWithProfile[];

  // Fetch comments with authors
  const { data: rawComments } = await supabase
    .from("potluck_comments")
    .select(
      "*, author:profiles!author_id(id, display_name, avatar_url, trust_score)"
    )
    .eq("potluck_id", potluckId)
    .is("removed_by_mod", null)
    .order("created_at");

  const comments = (rawComments ?? []) as unknown as PotluckCommentWithAuthor[];

  return (
    <div className="mx-auto max-w-2xl">
      <PotluckDetail
        potluck={potluck}
        dishSlots={dishSlots}
        rsvps={rsvps}
        comments={comments}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
