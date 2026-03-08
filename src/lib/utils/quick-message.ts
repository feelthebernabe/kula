import { createClient } from "@/lib/supabase/client";

/**
 * Send a quick message for a post (e.g., "Is this still available?").
 * Creates/finds a conversation and sends the message.
 * Returns the conversation ID on success, or null on failure.
 */
export async function sendQuickMessage({
  postId,
  authorId,
  message,
}: {
  postId: string;
  authorId: string;
  message: string;
}): Promise<{ conversationId: string } | { error: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please sign in" };
  }

  if (user.id === authorId) {
    return { error: "You can't message yourself" };
  }

  // Check if conversation already exists for this post between these users
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("post_id", postId)
    .or(
      `and(participant_a.eq.${user.id},participant_b.eq.${authorId}),and(participant_a.eq.${authorId},participant_b.eq.${user.id})`
    )
    .single();

  let conversationId: string;

  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        post_id: postId,
        participant_a: user.id,
        participant_b: authorId,
      })
      .select()
      .single();

    if (convError || !conversation) {
      return { error: "Failed to start conversation" };
    }

    conversationId = conversation.id;
  }

  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: message,
  });

  if (msgError) {
    return { error: "Failed to send message" };
  }

  return { conversationId };
}
