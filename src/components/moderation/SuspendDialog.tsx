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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { SUSPEND_DURATIONS } from "@/lib/constants/moderation";

interface SuspendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  targetUserId: string;
  targetUserName: string;
  moderatorId: string;
  flagId?: string;
}

export function SuspendDialog({
  open,
  onOpenChange,
  communityId,
  targetUserId,
  targetUserName,
  moderatorId,
  flagId,
}: SuspendDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [duration, setDuration] = useState("7d");
  const [reason, setReason] = useState("");
  const [removeContent, setRemoveContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setSubmitting(true);

    const selected = SUSPEND_DURATIONS.find((d) => d.value === duration);
    const expiresAt = selected?.days
      ? new Date(Date.now() + selected.days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert ban
    const { error: banError } = await supabase.from("community_bans").insert({
      community_id: communityId,
      user_id: targetUserId,
      banned_by: moderatorId,
      reason: reason.trim(),
      expires_at: expiresAt,
    });

    if (banError) {
      if (banError.message?.includes("hierarchy") || banError.message?.includes("Only admins")) {
        toast.error("You cannot suspend moderators or admins");
      } else if (banError.code === "23505") {
        toast.error("This user is already suspended");
      } else {
        toast.error("Failed to suspend user");
      }
      setSubmitting(false);
      return;
    }

    // Log mod action
    await supabase.from("mod_actions").insert({
      community_id: communityId,
      moderator_id: moderatorId,
      action_type: "user_suspended",
      target_user_id: targetUserId,
      flag_id: flagId || null,
      reason: reason.trim(),
    });

    // If resolving a flag, update it
    if (flagId) {
      await supabase
        .from("content_flags")
        .update({
          status: "actioned",
          resolved_by: moderatorId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", flagId)
        .eq("status", "pending");
    }

    // #13: Optionally bulk-remove user's active content in this community
    if (removeContent) {
      const now = new Date().toISOString();
      const removalReason = `User suspended: ${reason.trim()}`;

      // Remove active posts by this user in this community
      await supabase
        .from("posts")
        .update({
          removed_by_mod: moderatorId,
          removed_reason: removalReason,
          removed_at: now,
        })
        .eq("author_id", targetUserId)
        .eq("community_id", communityId)
        .eq("status", "active")
        .is("removed_by_mod", null);

      // Remove their threads
      await supabase
        .from("discussion_threads")
        .update({
          removed_by_mod: moderatorId,
          removed_reason: removalReason,
          removed_at: now,
        })
        .eq("author_id", targetUserId)
        .eq("community_id", communityId)
        .is("removed_by_mod", null);

      await supabase.from("mod_actions").insert({
        community_id: communityId,
        moderator_id: moderatorId,
        action_type: "content_removed",
        target_user_id: targetUserId,
        reason: `Bulk-removed content on suspension: ${reason.trim()}`,
      });
    }

    // Send notification
    await supabase.from("notifications").insert({
      recipient_id: targetUserId,
      type: "user_suspended",
      title: "You have been suspended",
      body: `You have been suspended from the community. Reason: ${reason.trim()}`,
      data: { community_id: communityId },
    });

    toast.success(`${targetUserName} has been suspended`);
    setReason("");
    setDuration("7d");
    setRemoveContent(false);
    onOpenChange(false);
    router.refresh();
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogDescription>
            Suspend <strong>{targetUserName}</strong> from this community. They
            will not be able to post or interact while suspended.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Duration</Label>
            <RadioGroup value={duration} onValueChange={setDuration}>
              {SUSPEND_DURATIONS.map((d) => (
                <div key={d.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={d.value} id={`dur-${d.value}`} />
                  <Label htmlFor={`dur-${d.value}`} className="cursor-pointer text-sm">
                    {d.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (required)</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Explain why this user is being suspended..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remove-content"
              checked={removeContent}
              onCheckedChange={(checked) => setRemoveContent(checked === true)}
            />
            <Label htmlFor="remove-content" className="text-sm cursor-pointer">
              Also remove all their posts and threads in this community
            </Label>
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
            disabled={submitting || !reason.trim()}
          >
            {submitting ? "Suspending..." : "Suspend User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
