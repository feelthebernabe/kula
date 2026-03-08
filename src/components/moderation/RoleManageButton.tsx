"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

interface RoleManageButtonProps {
  communityId: string;
  memberId: string;
  memberUserId: string;
  memberName: string;
  currentRole: string;
  currentUserId: string;
}

export function RoleManageButton({
  communityId,
  memberId,
  memberUserId,
  memberName,
  currentRole,
  currentUserId,
}: RoleManageButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState(false);

  // Don't show for self
  if (memberUserId === currentUserId) return null;

  const isMod = currentRole === "moderator";

  async function handleToggleRole() {
    setUpdating(true);
    const newRole = isMod ? "member" : "moderator";

    const { error } = await supabase
      .from("community_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to update role");
    } else {
      // Log mod action
      await supabase.from("mod_actions").insert({
        community_id: communityId,
        moderator_id: currentUserId,
        action_type: "role_changed",
        target_user_id: memberUserId,
        reason: `Changed role to ${newRole}`,
      });

      // Notify the user about their role change
      await supabase.from("notifications").insert({
        recipient_id: memberUserId,
        type: "community_announcement",
        title: newRole === "moderator" ? "You're now a moderator" : "Role updated",
        body: newRole === "moderator"
          ? "An admin promoted you to moderator. You now have access to moderation tools."
          : "Your moderator role has been removed by an admin.",
        data: { community_id: communityId },
      });

      toast.success(
        isMod
          ? `${memberName} is no longer a moderator`
          : `${memberName} is now a moderator`
      );
      router.refresh();
    }
    setUpdating(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={updating}
          aria-label={`Manage role for ${memberName}`}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleRole}>
          {isMod ? (
            <>
              <ShieldOff className="mr-2 h-4 w-4" />
              Remove Moderator
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Make Moderator
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
