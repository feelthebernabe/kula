"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DisputeDialogProps {
  exchangeId: string;
  currentUserId: string;
  otherPartyName: string;
  communityId?: string;
}

export function DisputeDialog({
  exchangeId,
  currentUserId,
  otherPartyName,
  communityId,
}: DisputeDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit() {
    if (reason.length < 20) {
      toast.error("Please provide at least 20 characters explaining the dispute");
      return;
    }

    setLoading(true);

    // Update exchange to disputed status with dispute details
    const { error } = await supabase
      .from("exchange_agreements")
      .update({
        status: "disputed",
        dispute_reason: reason,
        dispute_filed_by: currentUserId,
        dispute_filed_at: new Date().toISOString(),
      })
      .eq("id", exchangeId)
      .eq("status", "in_progress");

    if (error) {
      toast.error("Failed to file dispute: " + error.message);
      setLoading(false);
      return;
    }

    // Notify the other party
    const { data: exchange } = await supabase
      .from("exchange_agreements")
      .select("provider_id, receiver_id, post:posts!post_id(community_id)")
      .eq("id", exchangeId)
      .single();

    if (exchange) {
      const otherPartyId =
        exchange.provider_id === currentUserId
          ? exchange.receiver_id
          : exchange.provider_id;

      await supabase.from("notifications").insert({
        recipient_id: otherPartyId,
        type: "dispute_filed",
        title: "Dispute Filed",
        body: `A dispute has been filed on your exchange. Reason: ${reason.slice(0, 100)}`,
        data: { exchange_id: exchangeId },
      });

      // Notify community mods
      const cId = communityId || (exchange.post as unknown as { community_id: string | null })?.community_id;
      if (cId) {
        const { data: mods } = await supabase
          .from("community_members")
          .select("user_id")
          .eq("community_id", cId)
          .in("role", ["moderator", "admin"]);

        if (mods) {
          const notifications = mods.map((mod) => ({
            recipient_id: mod.user_id,
            type: "dispute_filed" as const,
            title: "Exchange Dispute Filed",
            body: `A dispute has been filed and needs moderator review.`,
            data: { exchange_id: exchangeId },
          }));
          if (notifications.length > 0) {
            await supabase.from("notifications").insert(notifications);
          }
        }
      }
    }

    toast.success("Dispute filed. Moderators have been notified.");
    setOpen(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50">
          <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
          File Dispute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File a Dispute</DialogTitle>
          <DialogDescription>
            Explain why you&apos;re disputing this exchange with {otherPartyName}.
            Community moderators will review and help resolve the issue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="disputeReason">Reason for dispute</Label>
            <Textarea
              id="disputeReason"
              placeholder="Describe the issue in detail..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/1000 characters (20 minimum)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || reason.length < 20}
            variant="destructive"
          >
            {loading ? "Filing..." : "File Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
