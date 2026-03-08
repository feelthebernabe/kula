import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      `
      *,
      participant_a_profile:profiles!participant_a(id, display_name, avatar_url),
      participant_b_profile:profiles!participant_b(id, display_name, avatar_url),
      post:posts!post_id(id, title)
    `
    )
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  // Get unread counts per conversation
  const conversationIds = (conversations ?? []).map((c) => c.id);
  let unreadMap: Record<string, number> = {};
  if (conversationIds.length > 0) {
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .eq("read", false);

    if (unreadRows) {
      for (const row of unreadRows) {
        unreadMap[row.conversation_id] = (unreadMap[row.conversation_id] || 0) + 1;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Your conversations about exchanges
        </p>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const otherUser =
              conv.participant_a === user.id
                ? conv.participant_b_profile
                : conv.participant_a_profile;

            const initials =
              otherUser?.display_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?";

            const unreadCount = unreadMap[conv.id] || 0;

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 py-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={otherUser?.avatar_url || undefined}
                        alt={otherUser?.display_name || "User"}
                      />
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${unreadCount > 0 ? "text-foreground" : "text-foreground"}`}>
                        {otherUser?.display_name || "Unknown User"}
                      </p>
                      {conv.post && (
                        <p className="text-xs text-muted-foreground truncate">
                          Re: {conv.post.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: true,
                            })
                          : "New"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No messages yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Respond to a post to start a conversation!
          </p>
        </div>
      )}
    </div>
  );
}
