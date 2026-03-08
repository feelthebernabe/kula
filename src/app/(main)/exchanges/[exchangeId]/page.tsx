import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ExchangeDetail } from "@/components/exchanges/ExchangeDetail";

export default async function ExchangeDetailPage({
  params,
}: {
  params: Promise<{ exchangeId: string }>;
}) {
  const { exchangeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: exchange } = await supabase
    .from("exchange_agreements")
    .select(
      `
      *,
      post:posts!post_id(id, title, type, category),
      provider:profiles!provider_id(id, display_name, avatar_url, trust_score),
      receiver:profiles!receiver_id(id, display_name, avatar_url, trust_score)
    `
    )
    .eq("id", exchangeId)
    .single();

  if (!exchange) notFound();

  // Check if reviews already exist
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("id, author_id")
    .eq("exchange_id", exchangeId);

  const hasReviewed = existingReviews?.some((r) => r.author_id === user.id) || false;

  return (
    <div className="mx-auto max-w-2xl">
      <ExchangeDetail
        exchange={exchange as unknown as Parameters<typeof ExchangeDetail>[0]["exchange"]}
        currentUserId={user.id}
        hasReviewed={hasReviewed}
      />
    </div>
  );
}
