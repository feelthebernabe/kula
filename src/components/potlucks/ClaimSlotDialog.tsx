"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DIETARY_OPTIONS, DISH_SLOT_CATEGORIES } from "@/lib/constants/potluck";
import { toast } from "sonner";
import type { PotluckDishSlotWithClaimer } from "@/types/database";

interface ClaimSlotDialogProps {
  slot: PotluckDishSlotWithClaimer;
  potluckId: string;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
}

export function ClaimSlotDialog({
  slot,
  potluckId,
  currentUserId,
  open,
  onClose,
}: ClaimSlotDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [dishName, setDishName] = useState("");
  const [servings, setServings] = useState("4");
  const [dietaryNotes, setDietaryNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const catInfo = DISH_SLOT_CATEGORIES.find((c) => c.value === slot.category);

  function toggleDietary(value: string) {
    setDietaryNotes((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  async function handleClaim() {
    if (!dishName.trim()) {
      toast.error("Please enter a dish name");
      return;
    }

    setLoading(true);

    // Claim the slot
    const { error: claimError } = await supabase
      .from("potluck_dish_slots")
      .update({
        claimed_by: currentUserId,
        dish_name: dishName.trim(),
        servings: parseInt(servings) || null,
        dietary_notes: dietaryNotes,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", slot.id)
      .is("claimed_by", null);

    if (claimError) {
      toast.error("Failed to claim slot — it may have been claimed already");
      setLoading(false);
      return;
    }

    // Auto-RSVP if not already RSVP'd
    await supabase.from("potluck_rsvps").upsert(
      {
        potluck_id: potluckId,
        user_id: currentUserId,
        status: "confirmed",
      },
      { onConflict: "potluck_id,user_id" }
    );

    toast.success("Slot claimed! You're signed up.");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Claim {catInfo?.emoji} {slot.label || catInfo?.label} Slot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dishName">What are you bringing? *</Label>
            <Input
              id="dishName"
              placeholder="e.g., Grandma's potato salad"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              type="number"
              min={1}
              max={100}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Dietary Notes</Label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Checkbox
                    checked={dietaryNotes.includes(opt.value)}
                    onCheckedChange={() => toggleDietary(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleClaim} disabled={loading || !dishName.trim()}>
            {loading ? "Claiming..." : "Claim Slot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
