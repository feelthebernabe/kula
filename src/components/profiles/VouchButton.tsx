"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserCheck, UserPlus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface VouchButtonProps {
  subjectId: string;
  subjectName: string;
  currentUserId: string | null;
  currentUserTrustScore: number;
  vouchCount: number;
  hasVouched: boolean;
  subjectVerificationTier: string;
  activeVouchCount?: number;
}

export function VouchButton({
  subjectId,
  subjectName,
  currentUserId,
  currentUserTrustScore,
  vouchCount,
  hasVouched: initialHasVouched,
  subjectVerificationTier,
  activeVouchCount = 0,
}: VouchButtonProps) {
  const [vouched, setVouched] = useState(initialHasVouched);
  const [count, setCount] = useState(vouchCount);
  const [myVouchCount, setMyVouchCount] = useState(activeVouchCount);
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

  async function doVouch() {
    if (loading) return;
    setLoading(true);

    const { error } = await supabase.from("community_vouches").insert({
      voucher_id: currentUserId!,
      subject_id: subjectId,
    });

    if (error) {
      if (error.message.includes("5 active vouches")) {
        toast.error("You can only have 5 active vouches at a time");
      } else {
        toast.error("Failed to vouch");
      }
    } else {
      setVouched(true);
      setCount((c) => c + 1);
      setMyVouchCount((c) => c + 1);
      toast.success(`You vouched for ${subjectName}!`);
    }

    setLoading(false);
  }

  async function removeVouch() {
    if (loading) return;
    setLoading(true);

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
      setMyVouchCount((c) => Math.max(0, c - 1));
    }

    setLoading(false);
  }

  if (vouched) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={removeVouch}
        disabled={loading}
        className="gap-1.5"
      >
        <UserCheck className="h-3.5 w-3.5" />
        Vouched
        {count > 0 && (
          <span className="text-xs text-muted-foreground">({count})</span>
        )}
      </Button>
    );
  }

  // At vouch limit
  if (myVouchCount >= 5) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        5/5 vouches used
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Vouch
          {count > 0 && (
            <span className="text-xs text-muted-foreground">({count})</span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vouch for {subjectName}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              By vouching, you are staking your reputation on {subjectName}.
            </p>
            <p className="text-sm">
              If they maintain good standing (trust 60+), you will receive a
              small trust boost (+0.5 pts). If they violate community standards
              (trust drops below 40), your score may decrease (-1 pt).
            </p>
            <p className="text-xs text-muted-foreground">
              {myVouchCount}/5 active vouches used
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={doVouch} disabled={loading}>
            {loading ? "Vouching..." : "Vouch"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
