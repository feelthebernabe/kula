import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Discuss" };

interface ThreadWithRelations {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string | null;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  community: { id: string; name: string } | null;
}

export default async function DiscussPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's community IDs
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", user.id);

  const communityIds = (memberships ?? []).map((m) => m.community_id);

  const { data: rawThreads } =
    communityIds.length > 0
      ? await supabase
          .from("discussion_threads")
          .select(
            "*, author:profiles!author_id(id, display_name, avatar_url), community:communities!community_id(id, name)"
          )
          .in("community_id", communityIds)
          .is("removed_by_mod", null)
          .order("pinned", { ascending: false })
          .order("last_reply_at", { ascending: false })
          .limit(20)
      : { data: [] };

  const threads = (rawThreads ?? []) as unknown as ThreadWithRelations[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discuss</h1>
          <p className="text-sm text-muted-foreground">
            Community conversations and announcements
          </p>
        </div>
        <Link href="/discuss/new">
          <Button size="sm">New Thread</Button>
        </Link>
      </div>

      {threads.length > 0 ? (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link key={thread.id} href={`/discuss/${thread.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {thread.pinned && (
                        <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {thread.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {thread.body}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{thread.author?.display_name}</span>
                      {thread.community && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {thread.community.name}
                        </span>
                      )}
                      {thread.last_reply_at && (
                        <span>
                          {formatDistanceToNow(
                            new Date(thread.last_reply_at),
                            { addSuffix: true }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {thread.reply_count}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            No discussions yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a conversation with your community!
          </p>
          <Link href="/discuss/new" className="mt-4 inline-block">
            <Button size="sm">Start a Discussion</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
