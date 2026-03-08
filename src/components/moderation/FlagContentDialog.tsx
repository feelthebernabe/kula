"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { FLAG_REASONS } from "@/lib/constants/moderation";
import type { FlagReason } from "@/types/database";

interface FlagContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "post" | "thread" | "reply" | "potluck_comment";
  contentId: string;
  contentAuthorId: string;
  communityId: string;
  reporterId: string;
}

export function FlagContentDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentAuthorId,
  communityId,
  reporterId,
}: FlagContentDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [reason, setReason] = useState<FlagReason | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("content_flags").insert({
      community_id: communityId,
      reporter_id: reporterId,
      content_type: contentType,
      content_id: contentId,
      content_author_id: contentAuthorId,
      reason,
      description: description.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You've already reported this content");
      } else if (error.message?.includes("Rate limit")) {
        toast.error("Too many reports. Please try again later.");
      } else {
        toast.error("Failed to submit report");
      }
    } else {
      // Notify community moderators about the new flag
      const { data: mods } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", communityId)
        .in("role", ["moderator", "admin"]);

      if (mods && mods.length > 0) {
        const notifications = mods
          .filter((m) => m.user_id !== reporterId)
          .map((m) => ({
            recipient_id: m.user_id,
            type: "content_flagged" as const,
            title: "New content flag",
            body: `A ${contentType} has been reported for ${reason}`,
            data: { community_id: communityId },
          }));

        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }

      toast.success("Report submitted. A moderator will review it.");
      setReason("");
      setDescription("");
      onOpenChange(false);
      router.refresh();
    }

    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help keep our community safe. Select a reason for reporting this{" "}
            {contentType === "potluck_comment" ? "comment" : contentType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={reason}
            onValueChange={(v) => setReason(v as FlagReason)}
          >
            {FLAG_REASONS.map((r) => (
              <div key={r.value} className="flex items-start space-x-3">
                <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                <Label htmlFor={r.value} className="cursor-pointer">
                  <span className="text-sm font-medium">{r.label}</span>
                  <p className="text-xs text-muted-foreground">
                    {r.description}
                  </p>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="flag-description">
              Additional details (optional)
            </Label>
            <Textarea
              id="flag-description"
              placeholder="Provide any additional context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
