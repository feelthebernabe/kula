"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PILOT_COMMUNITY_ID } from "@/lib/constants/pilot-community";
import { toast } from "sonner";

interface Community {
  id: string;
  name: string;
}

export default function NewThreadPage() {
  const searchParams = useSearchParams();
  const communityParam = searchParams.get("community");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [communityId, setCommunityId] = useState(
    communityParam || PILOT_COMMUNITY_ID
  );
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadCommunities() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id, communities(id, name)")
        .eq("user_id", user.id);

      const list = (memberships ?? [])
        .map(
          (m) =>
            (m as unknown as { communities: Community }).communities
        )
        .filter(Boolean);

      setCommunities(list);

      // If we have a community param and it's in the list, use it
      if (communityParam && list.some((c) => c.id === communityParam)) {
        setCommunityId(communityParam);
      } else if (list.length > 0 && !list.some((c) => c.id === communityId)) {
        setCommunityId(list[0].id);
      }
    }
    loadCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (body.trim().length < 10) {
      toast.error("Body must be at least 10 characters");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("discussion_threads")
      .insert({
        community_id: communityId,
        author_id: user.id,
        title: title.trim(),
        body: body.trim(),
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create thread: " + error.message);
      setLoading(false);
    } else {
      toast.success("Thread created!");
      router.push(`/discuss/${data.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Discussion Thread</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {communities.length > 1 && (
              <div className="space-y-2">
                <Label>Community</Label>
                <Select value={communityId} onValueChange={setCommunityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a community" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What do you want to discuss?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Details</Label>
              <Textarea
                id="body"
                placeholder="Share your thoughts, questions, or ideas..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Thread"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
