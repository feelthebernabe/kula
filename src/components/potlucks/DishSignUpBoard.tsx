"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClaimSlotDialog } from "./ClaimSlotDialog";
import { DISH_SLOT_CATEGORIES } from "@/lib/constants/potluck";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { PotluckDishSlotWithClaimer } from "@/types/database";
import type { DishSlotCategory } from "@/lib/constants/potluck";

interface DishSignUpBoardProps {
  potluckId: string;
  slots: PotluckDishSlotWithClaimer[];
  isHost: boolean;
  currentUserId: string | null;
}

export function DishSignUpBoard({
  potluckId,
  slots,
  isHost,
  currentUserId,
}: DishSignUpBoardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [claimingSlot, setClaimingSlot] = useState<PotluckDishSlotWithClaimer | null>(null);
  const [addingCategory, setAddingCategory] = useState<DishSlotCategory | null>(null);
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Group slots by category
  const grouped = DISH_SLOT_CATEGORIES.map((cat) => ({
    ...cat,
    slots: slots.filter((s) => s.category === cat.value),
  })).filter((group) => group.slots.length > 0 || isHost);

  async function handleAddSlot(category: DishSlotCategory) {
    setAddLoading(true);
    const { error } = await supabase.from("potluck_dish_slots").insert({
      potluck_id: potluckId,
      category,
      label: newSlotLabel.trim() || null,
    });

    if (error) {
      toast.error("Failed to add slot");
    } else {
      toast.success("Slot added");
      setNewSlotLabel("");
      setAddingCategory(null);
      router.refresh();
    }
    setAddLoading(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Dish Sign-Up Board
      </h3>

      {grouped.map((group) => (
        <div key={group.value} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {group.emoji} {group.label}
            </span>
            {isHost && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() =>
                  setAddingCategory(
                    addingCategory === group.value ? null : group.value
                  )
                }
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>

          {group.slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              {slot.claimed_by && slot.claimer ? (
                <>
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={slot.claimer.avatar_url || undefined}
                    />
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {slot.claimer.display_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {slot.dish_name || slot.label || group.label}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{slot.claimer.display_name}</span>
                      {slot.servings && (
                        <span>&middot; {slot.servings} servings</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(slot.dietary_notes ?? []).map((note) => (
                      <Badge
                        key={note}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {note}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {slot.label || `Bring a ${group.label.toLowerCase()}`}
                    </p>
                  </div>
                  {currentUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setClaimingSlot(slot)}
                    >
                      Claim
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add slot inline form */}
          {isHost && addingCategory === group.value && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Hint (optional)</Label>
                <Input
                  placeholder="e.g., Green salad"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  maxLength={200}
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleAddSlot(group.value)}
                disabled={addLoading}
              >
                {addLoading ? "..." : "Add"}
              </Button>
            </div>
          )}

          {group.slots.length === 0 && !isHost && (
            <p className="text-xs text-muted-foreground italic pl-2">
              No slots yet
            </p>
          )}
        </div>
      ))}

      {claimingSlot && (
        <ClaimSlotDialog
          slot={claimingSlot}
          potluckId={potluckId}
          currentUserId={currentUserId!}
          open={!!claimingSlot}
          onClose={() => setClaimingSlot(null)}
        />
      )}
    </div>
  );
}
