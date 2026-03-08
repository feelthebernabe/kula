"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ThreadReplyFormProps {
  threadId: string;
}

export function ThreadReplyForm({ threadId }: ThreadReplyFormProps) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (body.trim().length < 2) {
      toast.error("Reply must be at least 2 characters");
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

    const { error } = await supabase.from("discussion_replies").insert({
      thread_id: threadId,
      author_id: user.id,
      body: body.trim(),
    });

    if (error) {
      toast.error("Failed to post reply: " + error.message);
    } else {
      toast.success("Reply posted!");
      setBody("");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Write a reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      <Button type="submit" disabled={loading || body.trim().length < 2}>
        {loading ? "Posting..." : "Post Reply"}
      </Button>
    </form>
  );
}
