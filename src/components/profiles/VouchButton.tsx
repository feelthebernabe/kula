"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface VouchButtonProps {
  subjectId: string;
  subjectName: string;
  currentUserId: string | null;
  currentUserTrustScore: number;
  vouchCount: number;
  hasVouched: boolean;
  subjectVerificationTier: string;
}

export function VouchButton({
  subjectId,
  subjectName,
  currentUserId,
  currentUserTrustScore,
  vouchCount,
  hasVouched: initialHasVouched,
  subjectVerificationTier,
}: VouchButtonProps) {
  const [vouched, setVouched] = useState(initialHasVouched);
  const [count, setCount] = useState(vouchCount);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Only show if viewer is logged in, not self, has 80+ trust, and target isn't already community_vouched
  if (
    !currentUserId ||
    currentUserId === subjectId ||
    currentUserTrustScore < 80 ||
    subjectVerificationTier === "community_vouched"
  ) {
    // Still show vouch count if there are any
    if (count > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5" />
          {count} vouch{count !== 1 ? "es" : ""}
        </span>
      );
    }
    return null;
  }

  async function toggleVouch() {
    if (loading) return;
    setLoading(true);

    if (vouched) {
      const { error } = await supabase
        .from("community_vouches")
        .delete()
        .eq("voucher_id", currentUserId!)
        .eq("subject_id", subjectId);

      if (error) {
        toast.error("Failed to remove vouch");
      } else {
        setVouched(false);
        setCount((c) => c - 1);
      }
    } else {
      const { error } = await supabase.from("community_vouches").insert({
        voucher_id: currentUserId!,
        subject_id: subjectId,
      });

      if (error) {
        toast.error("Failed to vouch");
      } else {
        setVouched(true);
        setCount((c) => c + 1);
        toast.success(`You vouched for ${subjectName}!`);
      }
    }

    setLoading(false);
  }

  return (
    <Button
      variant={vouched ? "secondary" : "outline"}
      size="sm"
      onClick={toggleVouch}
      disabled={loading}
      className="gap-1.5"
    >
      {vouched ? (
        <UserCheck className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {vouched ? "Vouched" : "Vouch"}
      {count > 0 && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </Button>
  );
}
