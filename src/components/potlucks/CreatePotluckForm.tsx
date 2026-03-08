"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { LocationPicker } from "@/components/map/LocationPicker";
import { DISH_SLOT_CATEGORIES } from "@/lib/constants/potluck";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { DishSlotCategory } from "@/lib/constants/potluck";

interface DraftSlot {
  id: string;
  category: DishSlotCategory;
  label: string;
}

interface CreatePotluckFormProps {
  communityId: string;
  communityName: string;
}

export function CreatePotluckForm({
  communityId,
  communityName,
}: CreatePotluckFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 - Basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Step 1 - When
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 2 - Where
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [locationDetails, setLocationDetails] = useState("");

  // Step 3 - What
  const [capacity, setCapacity] = useState("");
  const [hostProviding, setHostProviding] = useState("");
  const [dishSlots, setDishSlots] = useState<DraftSlot[]>([]);
  const [newSlotCategory, setNewSlotCategory] =
    useState<DishSlotCategory>("main");
  const [newSlotLabel, setNewSlotLabel] = useState("");

  function addDishSlot() {
    setDishSlots((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: newSlotCategory,
        label: newSlotLabel.trim(),
      },
    ]);
    setNewSlotLabel("");
  }

  function removeDishSlot(id: string) {
    setDishSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function buildEventDateISO(): string | null {
    if (!eventDate || !eventTime) return null;
    return new Date(`${eventDate}T${eventTime}`).toISOString();
  }

  function buildEndTimeISO(): string | null {
    if (!eventDate || !endTime) return null;
    return new Date(`${eventDate}T${endTime}`).toISOString();
  }

  async function handleSubmit() {
    const eventDateISO = buildEventDateISO();
    if (!title || title.length < 5 || !eventDateISO) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expired");
      router.push("/login");
      return;
    }

    // Insert potluck
    const { data: potluck, error: potluckError } = await supabase
      .from("potlucks")
      .insert({
        community_id: communityId,
        host_id: user.id,
        title,
        description: description || null,
        images,
        event_date: eventDateISO,
        end_time: buildEndTimeISO(),
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        location_name: location?.name ?? null,
        location_details: locationDetails || null,
        capacity: capacity ? parseInt(capacity) : null,
        host_providing: hostProviding || null,
      })
      .select()
      .single();

    if (potluckError || !potluck) {
      toast.error("Failed to create potluck: " + potluckError?.message);
      setLoading(false);
      return;
    }

    // Batch-insert dish slots
    if (dishSlots.length > 0) {
      const { error: slotsError } = await supabase
        .from("potluck_dish_slots")
        .insert(
          dishSlots.map((slot) => ({
            potluck_id: potluck.id,
            category: slot.category,
            label: slot.label || null,
          }))
        );
      if (slotsError) {
        console.error("Failed to create dish slots:", slotsError);
      }
    }

    // Auto-RSVP the host
    await supabase.from("potluck_rsvps").insert({
      potluck_id: potluck.id,
      user_id: user.id,
      status: "confirmed",
    });

    toast.success("Potluck created!");
    router.push(`/potlucks/${potluck.id}`);
    router.refresh();
  }

  const steps = ["Basics", "When", "Where", "What"];

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex gap-2">
        {steps.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (i < step) setStep(i);
            }}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Planning for <span className="font-medium text-foreground">{communityName}</span>
      </p>

      {/* Step 0: Basics */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Summer BBQ in the Park"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/120 characters
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell people what to expect, any themes, dietary accommodations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Photos</Label>
            <ImageUploader
              bucket="post-images"
              folder="potlucks"
              maxFiles={4}
              value={images}
              onChange={setImages}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!title || title.length < 5}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: When */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventTime">Start Time *</Label>
              <Input
                id="eventTime"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time (optional)</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!eventDate || !eventTime}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Where */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationDetails">Location Details</Label>
            <Input
              id="locationDetails"
              placeholder="e.g., Near the pavilion, look for the blue tent"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {/* Step 3: What */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (optional)</Label>
            <Input
              id="capacity"
              type="number"
              min={2}
              max={500}
              placeholder="Leave blank for unlimited"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hostProviding">What are you providing?</Label>
            <Textarea
              id="hostProviding"
              placeholder="e.g., Grill, plates, cups, lemonade"
              value={hostProviding}
              onChange={(e) => setHostProviding(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>

          {/* Dish slot builder */}
          <div className="space-y-3">
            <Label>Dish Sign-Up Slots</Label>
            <p className="text-xs text-muted-foreground">
              Add slots for guests to claim. You can add more after creating.
            </p>

            {dishSlots.length > 0 && (
              <div className="space-y-2">
                {dishSlots.map((slot) => {
                  const catInfo = DISH_SLOT_CATEGORIES.find(
                    (c) => c.value === slot.category
                  );
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <span className="text-sm">{catInfo?.emoji}</span>
                      <Badge variant="outline" className="text-xs">
                        {catInfo?.label}
                      </Badge>
                      {slot.label && (
                        <span className="text-xs text-muted-foreground truncate">
                          {slot.label}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeDishSlot(slot.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <select
                  value={newSlotCategory}
                  onChange={(e) =>
                    setNewSlotCategory(e.target.value as DishSlotCategory)
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DISH_SLOT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Hint (optional)</Label>
                <Input
                  placeholder="e.g., Green salad"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  maxLength={200}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDishSlot}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create Potluck"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
