"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type FlagReason = Database["public"]["Enums"]["flag_reason"];

const REASONS: { value: FlagReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

export function ReportButton({
  contentType,
  contentId,
  contentAuthorId,
  communityId,
  reporterId,
}: {
  contentType: "post" | "thread" | "reply" | "potluck_comment" | "profile";
  contentId: string;
  contentAuthorId: string;
  communityId: string;
  reporterId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Don't show report button for own content
  if (reporterId === contentAuthorId) return null;

  async function handleSubmit() {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setLoading(true);
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
        toast.error("Failed to submit report: " + error.message);
      }
    } else {
      toast.success("Report submitted. Thank you for keeping the community safe.");
      setOpen(false);
      setReason(null);
      setDescription("");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <Flag className="mr-1.5 h-3.5 w-3.5" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us keep the community safe. Reports are reviewed by moderators.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select
              value={reason ?? undefined}
              onValueChange={(v) => setReason(v as FlagReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Details (optional)</Label>
            <Textarea
              placeholder="Provide additional context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={loading || !reason}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
