"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";

interface SkillEndorseButtonProps {
  endorsedId: string;
  skill: string;
  currentUserId: string | null;
  endorsementCount: number;
  hasEndorsed: boolean;
}

export function SkillEndorseButton({
  endorsedId,
  skill,
  currentUserId,
  endorsementCount,
  hasEndorsed,
}: SkillEndorseButtonProps) {
  const supabase = createClient();
  const [count, setCount] = useState(endorsementCount);
  const [endorsed, setEndorsed] = useState(hasEndorsed);
  const [updating, setUpdating] = useState(false);

  const isOwnProfile = currentUserId === endorsedId;
  const canInteract = currentUserId && !isOwnProfile;

  async function handleClick() {
    if (!currentUserId || isOwnProfile || updating) return;

    setUpdating(true);

    if (endorsed) {
      // Un-endorse
      const { error } = await supabase
        .from("skill_endorsements")
        .delete()
        .eq("endorser_id", currentUserId)
        .eq("endorsed_id", endorsedId)
        .eq("skill", skill);

      if (error) {
        toast.error("Failed to remove endorsement");
      } else {
        setCount((c) => Math.max(0, c - 1));
        setEndorsed(false);
        toast.success(`Removed endorsement for ${skill}`);
      }
    } else {
      // Endorse
      const { error } = await supabase.from("skill_endorsements").insert({
        endorser_id: currentUserId,
        endorsed_id: endorsedId,
        skill,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Already endorsed");
        } else {
          toast.error("Failed to endorse");
        }
      } else {
        setCount((c) => c + 1);
        setEndorsed(true);
        toast.success(`Endorsed ${skill}`);
      }
    }

    setUpdating(false);
  }

  return (
    <Badge
      variant={endorsed ? "default" : "secondary"}
      className={`gap-1 ${canInteract ? "cursor-pointer hover:bg-primary/20" : ""}`}
      onClick={canInteract ? handleClick : undefined}
      title={canInteract ? (endorsed ? "Click to remove endorsement" : "Click to endorse") : undefined}
    >
      {skill}
      {count > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] opacity-70">
          <ThumbsUp className="h-2.5 w-2.5" />
          {count}
        </span>
      )}
      {updating && <span className="text-[10px]">...</span>}
    </Badge>
  );
}
